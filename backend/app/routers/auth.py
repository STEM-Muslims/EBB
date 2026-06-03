import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from jose import jwt

from app.dependencies import require_admin
from app.config import (
    ALLOWED_ADMIN_EMAILS,
    BACKEND_URL,
    FRONTEND_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    JWT_ALGORITHM,
    JWT_EXPIRY_SECONDS,
    JWT_SECRET,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


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
        print(f"DEBUG token_resp: {token_resp.status_code} {token_resp.text}")
        access_token = token_resp.json().get("access_token")
        if not access_token:
            return RedirectResponse(f"{FRONTEND_URL}/admin/login?error=AccessDenied")

        user_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        print(f"DEBUG userinfo: {user_resp.status_code} {user_resp.text}")
        email = user_resp.json().get("email", "").lower()

    print(f"DEBUG google_callback: email={repr(email)}, allowed={ALLOWED_ADMIN_EMAILS}")
    if email not in ALLOWED_ADMIN_EMAILS:
        return RedirectResponse(f"{FRONTEND_URL}/admin/login?error=AccessDenied")

    return RedirectResponse(f"{FRONTEND_URL}/admin/callback?token={_create_token(email)}")


@router.get("/me")
def get_me(email: str = Depends(require_admin)):
    return {"email": email}
