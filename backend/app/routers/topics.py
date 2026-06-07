from datetime import datetime
from typing import List, Optional

from app.db import get_db
from app.models.topic import LevelType, Topic
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

router = APIRouter(prefix="/topics", tags=["topics"])


class TopicCreate(SQLModel):
    name: str
    level_type: LevelType
    parent_id: Optional[int] = None
    notes: Optional[str] = None
    sort_order: int = 0


class TopicUpdate(SQLModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


def get_topic_or_404(session: Session, topic_id: int) -> Topic:
    topic = session.get(Topic, topic_id)
    if not topic or not topic.is_active:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.get("/subjects", response_model=List[Topic])
def get_subjects(session: Session = Depends(get_db)):
    statement = (
        select(Topic)
        .where(
            Topic.level_type == LevelType.SUBJECT,
            Topic.is_active,
        )
        .order_by(Topic.sort_order)
    )
    return session.exec(statement).all()


@router.get("/tree")
def get_tree(session: Session = Depends(get_db)):
    topics = session.exec(select(Topic).where(Topic.is_active)).all()

    lookup = {t.id: {**t.model_dump(), "children": []} for t in topics}

    root = []

    for t in topics:
        if t.parent_id is None:
            root.append(lookup[t.id])
        else:
            parent = lookup.get(t.parent_id)
            if parent:
                parent["children"].append(lookup[t.id])

    return root


@router.get("/{parent_id}/children", response_model=List[Topic])
def get_children(parent_id: int, session: Session = Depends(get_db)):
    parent = get_topic_or_404(session, parent_id)

    statement = (
        select(Topic)
        .where(Topic.parent_id == parent.id, Topic.is_active)
        .order_by(Topic.sort_order)
    )

    return session.exec(statement).all()


@router.get("/{topic_id}", response_model=Topic)
def get_topic(topic_id: int, session: Session = Depends(get_db)):
    return get_topic_or_404(session, topic_id)


@router.post("", response_model=Topic)
def create_topic(payload: TopicCreate, session: Session = Depends(get_db)):
    # Validation rules

    if payload.level_type == LevelType.SUBJECT and payload.parent_id is not None:
        raise HTTPException(400, "Subject cannot have a parent")

    if payload.level_type != LevelType.SUBJECT and payload.parent_id is None:
        raise HTTPException(400, "Non-subject must have a parent")

    if payload.parent_id:
        parent = get_topic_or_404(session, payload.parent_id)

        if parent.level_type == LevelType.VIDEO:
            raise HTTPException(400, "Videos cannot have children")

    topic = Topic(
        name=payload.name,
        level_type=payload.level_type,
        parent_id=payload.parent_id,
        notes=payload.notes,
        sort_order=payload.sort_order,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    session.add(topic)
    session.commit()
    session.flush()
    session.refresh(topic)

    return topic


@router.patch("/{topic_id}", response_model=Topic)
def update_topic(
    topic_id: int,
    payload: TopicUpdate,
    session: Session = Depends(get_db),
):
    topic = get_topic_or_404(session, topic_id)

    update_data = payload.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(topic, key, value)

    topic.updated_at = datetime.utcnow()

    session.add(topic)
    session.commit()
    session.refresh(topic)

    return topic


@router.delete("/{topic_id}")
def delete_topic(topic_id: int, session: Session = Depends(get_db)):
    topic = get_topic_or_404(session, topic_id)

    topic.is_active = False
    topic.updated_at = datetime.utcnow()

    session.add(topic)
    session.commit()

    return {"message": "deleted"}
