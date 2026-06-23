import time
from urllib.parse import urlencode

import httpx
from app.config import (
    BACKEND_URL,
    FRONTEND_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    JWT_ALGORITHM,
    JWT_EXPIRY_SECONDS,
    JWT_SECRET,
)
from app.db import engine
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.routers.users import build_user_profile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlmodel import Session, select

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter(prefix="/auth", tags=["auth"])

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


class LoginRequest(BaseModel):
    email: str
    password: str


def _create_token(email: str) -> str:
    return jwt.encode(
        {"sub": email, "exp": int(time.time()) + JWT_EXPIRY_SECONDS},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


@router.get("/google")
def google_login():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{BACKEND_URL}/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    }
    return RedirectResponse(f"{_GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None):
    if error or not code:
        return RedirectResponse(f"{FRONTEND_URL}/admin/login?error=AccessDenied")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": f"{BACKEND_URL}/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        access_token = token_resp.json().get("access_token")
        if not access_token:
            return RedirectResponse(f"{FRONTEND_URL}/admin/login?error=AccessDenied")

        user_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        email = user_resp.json().get("email", "").lower()
        google_id = user_resp.json().get("sub")

    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/admin/login?error=AccessDenied")

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            return RedirectResponse(f"{FRONTEND_URL}/admin/login?error=AccessDenied")
        if not user.google_id:
            user.google_id = google_id
            session.add(session.merge(user))
            session.commit()

    return RedirectResponse(
        f"{FRONTEND_URL}/admin/callback?token={_create_token(email)}"
    )


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    profile = build_user_profile(current_user, session)
    return {
        "email": current_user.email,
        "is_admin": bool(current_user.is_admin),
        **profile,
    }


@router.post("/login")
def password_login(req: LoginRequest, session: Session = Depends(get_db)):
    # Standardize email to lowercase for consistent lookups
    email = req.email.lower()

    user = session.exec(select(User).where(User.email == email)).first()

    # Reject if user doesn't exist (any provisioned user may log in)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Reject if user has no password set OR if the password doesn't match
    if not user.hashed_password or not _pwd_context.verify(
        req.password, user.hashed_password
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_token(user.email)

    return {"access_token": token, "token_type": "bearer"}
