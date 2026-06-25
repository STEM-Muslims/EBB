from app.dependencies import get_db, require_admin
from app.models.language import Language
from app.models.role import RoleType, UserRole
from app.models.topic import LevelType, Topic
from app.models.user import User
from app.models.user_language import UserLanguage
from app.models.user_subject import UserTeachingSubject
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
    roles: list[RoleType] = []
    teaching_subject_ids: list[int] = []
    language_ids: list[int] = []


class UserResponse(BaseModel):
    id: int
    email: str
    is_admin: bool
    google_id: str | None
    roles: list[RoleType]
    teaching_subject_ids: list[int]
    language_ids: list[int]


class UpdateUserRequest(BaseModel):
    email: str
    is_admin: bool
    roles: list[RoleType] = []
    teaching_subject_ids: list[int] = []
    language_ids: list[int] = []


class UpdatePasswordRequest(BaseModel):
    password: str


def build_user_profile(user: User, session: Session) -> dict:
    """Return a user's roles + teaching subject ids + language ids."""
    roles = session.exec(
        select(UserRole.role).where(UserRole.user_id == user.id)
    ).all()
    teaching_subject_ids = session.exec(
        select(UserTeachingSubject.topic_id).where(
            UserTeachingSubject.user_id == user.id
        )
    ).all()
    language_ids = session.exec(
        select(UserLanguage.language_id).where(UserLanguage.user_id == user.id)
    ).all()
    return {
        "roles": list(roles),
        "teaching_subject_ids": list(teaching_subject_ids),
        "language_ids": list(language_ids),
    }


def _user_response(user: User, session: Session) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        is_admin=bool(user.is_admin),
        google_id=user.google_id,
        **build_user_profile(user, session),
    )


def _validate_subjects(topic_ids: list[int], session: Session) -> None:
    for topic_id in set(topic_ids):
        topic = session.get(Topic, topic_id)
        if not topic or topic.level_type != LevelType.SUBJECT or not topic.is_active:
            raise HTTPException(400, f"Invalid subject id: {topic_id}")


def _validate_languages(language_ids: list[int], session: Session) -> None:
    for language_id in set(language_ids):
        language = session.get(Language, language_id)
        if not language or not language.is_active:
            raise HTTPException(400, f"Invalid language id: {language_id}")


def _sync_profile(
    user: User,
    roles: list[RoleType],
    teaching_subject_ids: list[int],
    language_ids: list[int],
    session: Session,
) -> None:
    """Replace a user's role/subject/language rows from the submitted id lists."""
    if teaching_subject_ids and RoleType.TEACHER not in roles:
        raise HTTPException(400, "Teaching subjects require the TEACHER role")
    if language_ids and RoleType.TRANSLATOR not in roles:
        raise HTTPException(400, "Languages require the TRANSLATOR role")

    _validate_subjects(teaching_subject_ids, session)
    _validate_languages(language_ids, session)

    for existing in session.exec(
        select(UserRole).where(UserRole.user_id == user.id)
    ).all():
        session.delete(existing)
    for existing in session.exec(
        select(UserTeachingSubject).where(UserTeachingSubject.user_id == user.id)
    ).all():
        session.delete(existing)
    for existing in session.exec(
        select(UserLanguage).where(UserLanguage.user_id == user.id)
    ).all():
        session.delete(existing)
    session.flush()

    for role in dict.fromkeys(roles):
        session.add(UserRole(user_id=user.id, role=role))
    for topic_id in dict.fromkeys(teaching_subject_ids):
        session.add(UserTeachingSubject(user_id=user.id, topic_id=topic_id))
    for language_id in dict.fromkeys(language_ids):
        session.add(UserLanguage(user_id=user.id, language_id=language_id))


@router.patch("/users/me/password")
def change_own_password(
    req: UpdatePasswordRequest,
    email: str = Depends(require_admin),
    session: Session = Depends(get_db),
):
    user = session.exec(select(User).where(User.email == email)).first()

    if not user:
        raise HTTPException(404, "User not found")

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

    _sync_profile(
        user, req.roles, req.teaching_subject_ids, req.language_ids, session
    )

    session.commit()
    session.refresh(user)

    return _user_response(user, session)


@router.get("/users", dependencies=[Depends(require_admin)])
def get_users(session: Session = Depends(get_db)):
    users = session.exec(select(User)).all()
    return [_user_response(user, session) for user in users]


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
    session.flush()

    _sync_profile(
        db_user, user.roles, user.teaching_subject_ids, user.language_ids, session
    )

    session.commit()
    session.refresh(db_user)

    return _user_response(db_user, session)
