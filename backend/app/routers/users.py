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


class UserResponse(BaseModel):
    id: int
    email: str
    is_admin: bool
    google_id: str | None


class UpdateUserRequest(BaseModel):
    email: str
    is_admin: bool


class UpdatePasswordRequest(BaseModel):
    password: str


@router.patch("/users/me/password")
def change_own_password(
    req: UpdatePasswordRequest,
    email: str = Depends(require_admin),
    session: Session = Depends(get_db),
):
    user = session.exec(select(User).where(User.email == email)).first()

    if not user:
        raise HTTPException(404, "User not found")
    print(repr(req.password))
    print(len(req.password))
    print(len(req.password.encode("utf-8")))

    user.hashed_password = _pwd_context.hash(req.password)

    session.add(user)
    session.commit()

    return {"ok": True}


@router.patch("/users/{user_id}/password", dependencies=[Depends(require_admin)])
def reset_password(
    user_id: int,
    req: UpdatePasswordRequest,
    session: Session = Depends(get_db),
):
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(404, "User not found")

    user.hashed_password = _pwd_context.hash(req.password)

    session.add(user)
    session.commit()

    return {"ok": True}


@router.patch("/users/{user_id}", dependencies=[Depends(require_admin)])
def update_user(
    user_id: int,
    req: UpdateUserRequest,
    session: Session = Depends(get_db),
):
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(404, "User not found")

    existing = session.exec(
        select(User).where(User.email == req.email, User.id != user_id)
    ).first()

    if existing:
        raise HTTPException(400, "Email already registered")

    user.email = req.email
    user.is_admin = req.is_admin

    session.add(user)
    session.commit()
    session.refresh(user)

    return user


@router.get("/users", dependencies=[Depends(require_admin)])
def get_users(session: Session = Depends(get_db)):
    return session.exec(select(User)).all()


@router.post("/users", dependencies=[Depends(require_admin)])
def create_user(user: CreateUserRequest, session: Session = Depends(get_db)):
    existing = session.exec(select(User).where(User.email == user.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user: User = User(
        email=user.email,
        hashed_password=_pwd_context.hash(user.password) if user.password else None,
        is_admin=user.is_admin,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    if db_user and db_user.id and db_user.is_admin:
        return UserResponse(
            id=db_user.id,
            email=db_user.email,
            is_admin=db_user.is_admin,
            google_id=db_user.google_id,
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to create user")
