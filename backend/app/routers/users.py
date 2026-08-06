import re
import uuid
from urllib.parse import urlparse

from app.core.config import AWS_REGION, S3_BUCKET_NAME, s3_client
from app.core.security import create_access_token
from app.dependencies import get_current_user, get_db, require_admin
from app.models.language import Language
from app.models.role import RoleType, UserRole
from app.models.topic import LevelType, Topic
from app.models.user import User
from app.models.user_language import UserLanguage
from app.models.user_subject import UserTeachingSubject
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlmodel import Session, select

router = APIRouter()
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Avatar uploads: small, already downscaled client-side. Keep a generous cap as a
# safety net and only accept a short list of web-friendly image types.
_MAX_AVATAR_BYTES = 5 * 1024 * 1024
_AVATAR_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}


def _avatar_url(key: str) -> str:
    return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"


def _avatar_key_from_url(url: str | None) -> str | None:
    """Recover the S3 object key from a stored avatar URL (for cleanup)."""
    if not url:
        return None
    key = urlparse(url).path.lstrip("/")
    return key if key.startswith("avatars/") else None


class CreateUserRequest(BaseModel):
    email: str
    first_name: str | None = None
    last_name: str | None = None
    password: str | None = None
    is_admin: bool = False
    phone_number: str | None = None
    roles: list[RoleType] = []
    teaching_subject_ids: list[int] = []
    language_ids: list[int] = []


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str | None
    last_name: str | None
    is_admin: bool
    google_id: str | None
    has_password: bool
    avatar_url: str | None
    phone_number: str | None = None
    roles: list[RoleType]
    teaching_subject_ids: list[int]
    language_ids: list[int]


class UpdateUserRequest(BaseModel):
    email: str
    is_admin: bool
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None
    roles: list[RoleType] = []
    teaching_subject_ids: list[int] = []
    language_ids: list[int] = []


class UpdatePasswordRequest(BaseModel):
    password: str


class ChangeOwnPasswordRequest(BaseModel):
    current_password: str | None = None
    new_password: str


class ChangeEmailRequest(BaseModel):
    current_password: str
    new_email: str


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
        first_name=user.first_name,
        last_name=user.last_name,
        is_admin=bool(user.is_admin),
        google_id=user.google_id,
        has_password=bool(user.hashed_password),
        avatar_url=user.avatar_url,
        phone_number=user.phone_number,
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


class UpdateProfileRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None

@router.patch("/users/me/profile")
def update_own_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    user = session.exec(select(User).where(User.email == current_user.email)).first()
    if not user:
        raise HTTPException(404, "User not found")

    user.first_name = req.first_name
    user.last_name = req.last_name
    user.phone_number = req.phone_number

    session.add(user)
    session.commit()
    session.refresh(user)
    return _user_response(user, session)

@router.patch("/users/me/password")
def change_own_password(
    req: ChangeOwnPasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    user = session.exec(select(User).where(User.email == current_user.email)).first()

    if not user:
        raise HTTPException(404, "User not found")

    if user.hashed_password:
        if not req.current_password or not _pwd_context.verify(
            req.current_password, user.hashed_password
        ):
            raise HTTPException(401, "Current password is incorrect")

    if len(req.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    user.hashed_password = _pwd_context.hash(req.new_password)

    session.add(user)
    session.commit()

    return {"ok": True}


@router.patch("/users/me/email")
def change_own_email(
    req: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    user = session.exec(select(User).where(User.email == current_user.email)).first()

    if not user:
        raise HTTPException(404, "User not found")

    if user.google_id:
        raise HTTPException(400, "Your email is managed by your Google account")

    if not user.hashed_password or not _pwd_context.verify(
        req.current_password, user.hashed_password
    ):
        raise HTTPException(401, "Current password is incorrect")

    new_email = req.new_email.strip().lower()
    if not _EMAIL_RE.match(new_email):
        raise HTTPException(400, "Enter a valid email address")

    existing = session.exec(
        select(User).where(User.email == new_email, User.id != user.id)
    ).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    user.email = new_email
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(user.email)
    return {"email": user.email, "access_token": token, "token_type": "bearer"}


@router.post("/users/me/avatar")
async def upload_own_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    """Set the signed-in user's profile picture. Any provisioned user may do this
    (not admin-only). The image is stored in S3 and its public URL saved on the
    user row; a previously uploaded avatar is removed from S3 best-effort."""
    ext = _AVATAR_EXT.get((file.content_type or "").lower())
    if not ext:
        raise HTTPException(400, "Avatar must be a JPEG, PNG, WebP or GIF image.")

    data = await file.read()
    if not data:
        raise HTTPException(400, "The image file is empty.")
    if len(data) > _MAX_AVATAR_BYTES:
        raise HTTPException(400, "Image is too large (max 5 MB).")

    user = session.exec(select(User).where(User.email == current_user.email)).first()
    if not user:
        raise HTTPException(404, "User not found")

    key = f"avatars/{uuid.uuid4().hex}.{ext}"
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=file.content_type,
            ACL="public-read",
        )
    except Exception as exc:  # noqa: BLE001 - surface the reason to the client
        raise HTTPException(502, f"Could not store the image: {exc}")

    old_key = _avatar_key_from_url(user.avatar_url)

    user.avatar_url = _avatar_url(key)
    session.add(user)
    session.commit()
    session.refresh(user)

    if old_key and old_key != key:
        try:
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=old_key)
        except Exception:  # noqa: BLE001 - cleanup is best-effort
            pass

    return {"avatar_url": user.avatar_url}


@router.delete("/users/me/avatar")
def delete_own_avatar(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    """Remove the signed-in user's profile picture (clears the row + S3 object)."""
    user = session.exec(select(User).where(User.email == current_user.email)).first()
    if not user:
        raise HTTPException(404, "User not found")

    key = _avatar_key_from_url(user.avatar_url)
    user.avatar_url = None
    session.add(user)
    session.commit()

    if key:
        try:
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=key)
        except Exception:  # noqa: BLE001 - cleanup is best-effort
            pass

    return {"avatar_url": None}


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
    if req.first_name is not None:
        user.first_name = req.first_name.strip() or None
    if req.last_name is not None:
        user.last_name = req.last_name.strip() or None
    user.phone_number = req.phone_number
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
        first_name=(user.first_name or "").strip() or None,
        last_name=(user.last_name or "").strip() or None,
        hashed_password=_pwd_context.hash(user.password) if user.password else None,
        is_admin=user.is_admin,
        phone_number=user.phone_number,
    )
    session.add(db_user)
    session.flush()

    _sync_profile(
        db_user, user.roles, user.teaching_subject_ids, user.language_ids, session
    )

    session.commit()
    session.refresh(db_user)

    return _user_response(db_user, session)
