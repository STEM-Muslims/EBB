from app.config import JWT_ALGORITHM, JWT_SECRET
from app.db import engine
from fastapi import Header, HTTPException
from jose import JWTError, jwt
from sqlmodel import Session


def get_db():
    with Session(engine) as session:
        yield session


def require_admin(authorization: str = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ")
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return data["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
