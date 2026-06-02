from app.db import get_db
from app.models import User
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

router = APIRouter()


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
        hashed_password=user.password,
    )

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return db_user
