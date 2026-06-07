from app.config import JWT_ALGORITHM, JWT_SECRET
from app.db import engine, get_db
from app.models.user import User
from fastapi import Header, HTTPException
from jose import JWTError, jwt
from sqlmodel import Session, select


def get_db():
    with Session(engine) as session:
        yield session


def require_admin(authorization: str = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ")
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = data["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user or not user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorised")

    return email
