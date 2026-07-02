from app.dependencies import get_current_user, get_db, require_admin
from app.models.language import Language
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, col, select

router = APIRouter(prefix="/languages", tags=["languages"])


class LanguageCreate(SQLModel):
    name: str
    code: str | None = None


class LanguageUpdate(SQLModel):
    name: str | None = None
    code: str | None = None
    is_active: bool | None = None


@router.get("")
def list_languages(
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    return session.exec(
        select(Language).where(Language.is_active).order_by(col(Language.name))
    ).all()


@router.post("", dependencies=[Depends(require_admin)])
def create_language(req: LanguageCreate, session: Session = Depends(get_db)):
    existing = session.exec(
        select(Language).where(Language.name == req.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Language already exists")

    language = Language(name=req.name, code=req.code)
    session.add(language)
    session.commit()
    session.refresh(language)
    return language


@router.patch("/{language_id}", dependencies=[Depends(require_admin)])
def update_language(
    language_id: int,
    req: LanguageUpdate,
    session: Session = Depends(get_db),
):
    language = session.get(Language, language_id)
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")

    if req.name is not None:
        clash = session.exec(
            select(Language).where(
                Language.name == req.name, Language.id != language_id
            )
        ).first()
        if clash:
            raise HTTPException(status_code=400, detail="Language already exists")
        language.name = req.name
    if req.code is not None:
        language.code = req.code
    if req.is_active is not None:
        language.is_active = req.is_active

    session.add(language)
    session.commit()
    session.refresh(language)
    return language


@router.delete("/{language_id}", dependencies=[Depends(require_admin)])
def delete_language(language_id: int, session: Session = Depends(get_db)):
    language = session.get(Language, language_id)
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")

    language.is_active = False
    session.add(language)
    session.commit()
    return {"ok": True}
