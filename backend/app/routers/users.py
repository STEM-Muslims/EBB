from app.dependencies import get_db
from app.models import User
from fastapi import APIRouter, Depends
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlmodel import Session, select

router = APIRouter()

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class CreateUserRequest(BaseModel):
    email: str
    password: str


@router.get("/users")
def get_users(session: Session = Depends(get_db)):
    return session.exec(select(User)).all()


@router.post("/users")
def create_user(
    user: CreateUserRequest,
    session: Session = Depends(get_db),
):
    db_user = User(
        email=user.email,
        hashed_password=_pwd_context.hash(user.password),
    )

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return db_user
