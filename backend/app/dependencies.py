from app.config import JWT_ALGORITHM, JWT_SECRET
from app.db import engine, get_db
from app.models.role import RoleType, UserRole
from app.models.user import User
from fastapi import Header, HTTPException
from jose import JWTError, jwt
from sqlmodel import Session, select


def get_db():
    with Session(engine) as session:
        yield session


def _decode_email(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ")
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return data["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(authorization: str = Header(default=None)) -> User:
    """Authenticate any provisioned user (no admin requirement)."""
    email = _decode_email(authorization)
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        session.expunge(user)
    return user


def require_roles(*roles: RoleType):
    """Dependency factory: allow admins or users holding any of the given roles."""

    def _checker(authorization: str = Header(default=None)) -> str:
        email = _decode_email(authorization)
        with Session(engine) as session:
            user = session.exec(select(User).where(User.email == email)).first()
            if not user:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            if user.is_admin:
                return email
            user_roles = session.exec(
                select(UserRole.role).where(UserRole.user_id == user.id)
            ).all()
            if not any(role in user_roles for role in roles):
                raise HTTPException(status_code=403, detail="Not authorised")
        return email

    return _checker


def require_admin(authorization: str = Header(default=None)) -> str:
    email = _decode_email(authorization)
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user or not user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorised")

    return email
