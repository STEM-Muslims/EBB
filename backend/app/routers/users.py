from app.dependencies import get_db, require_admin
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlmodel import Session, select

router = APIRouter()
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class CreateUserRequest(BaseModel):
    email: str
    password: str | None = None
    is_admin: bool = False


@router.get("/users", dependencies=[Depends(require_admin)])
def get_users(session: Session = Depends(get_db)):
    return session.exec(select(User)).all()


@router.post("/users", dependencies=[Depends(require_admin)])
def create_user(user: CreateUserRequest, session: Session = Depends(get_db)):
    existing = session.exec(select(User).where(User.email == user.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = User(
        email=user.email,
        hashed_password=_pwd_context.hash(user.password) if user.password else None,
        is_admin=user.is_admin,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user
