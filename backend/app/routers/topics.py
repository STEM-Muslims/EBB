from datetime import datetime
from typing import List, Optional

from app.db import get_db
from app.models.topic import LevelType, Topic
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, col, select

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


class TopicOrderUpdate(SQLModel):
    parent_id: int | None
    topic_ids: list[int]


def get_topic_or_404(session: Session, topic_id: int) -> Topic:
    topic = session.get(Topic, topic_id)
    if not topic or not topic.is_active:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.patch("/reorder")
def reorder_topics(
    req: TopicOrderUpdate,
    session: Session = Depends(get_db),
):
    # No duplicates
    if len(req.topic_ids) != len(set(req.topic_ids)):
        raise HTTPException(
            status_code=400,
            detail="topic_ids contains duplicates",
        )

    # Fetch all children of this parent
    siblings = session.exec(
        select(Topic).where(Topic.parent_id == req.parent_id, Topic.is_active)
    ).all()
    sibling_ids = {topic.id for topic in siblings}
    requested_ids = set(req.topic_ids)

    # Must provide the complete set of siblings
    if sibling_ids != requested_ids:
        raise HTTPException(
            status_code=400,
            detail="topic_ids must contain all siblings exactly once",
        )

    # Make lookup easier
    topics_by_id = {topic.id: topic for topic in siblings}

    # Rebuild linked list
    for i, topic_id in enumerate(req.topic_ids):
        topic = topics_by_id[topic_id]

        topic.prev_id = req.topic_ids[i - 1] if i > 0 else None

        topic.next_id = req.topic_ids[i + 1] if i < len(req.topic_ids) - 1 else None

        session.add(topic)

    session.commit()

    return {"ok": True}


@router.get("/subjects", response_model=List[Topic])
def get_subjects(session: Session = Depends(get_db)):
    statement = (
        select(Topic)
        .where(
            Topic.level_type == LevelType.SUBJECT,
            Topic.is_active,
        )
        .order_by(col(Topic.sort_order))
    )
    return session.exec(statement).all()


@router.get("/tree")
def get_tree(session: Session = Depends(get_db)):
    topics = session.exec(select(Topic).where(Topic.is_active)).all()

    lookup = {
        t.id: {
            **t.model_dump(),
            "children": [],
        }
        for t in topics
    }

    # Group siblings by parent
    by_parent: dict[int | None, list[Topic]] = {}

    for topic in topics:
        by_parent.setdefault(topic.parent_id, []).append(topic)

    def build_children(parent_id: int | None):
        siblings = by_parent.get(parent_id, [])

        if not siblings:
            return []

        sibling_lookup = {topic.id: topic for topic in siblings}

        # Find the head(s) of the linked list
        heads = [topic for topic in siblings if topic.prev_id is None]

        # Fallback for old data where prev/next haven't been populated
        if len(heads) != 1:
            ordered = sorted(
                siblings,
                key=lambda t: (t.sort_order, t.id),
            )

            return [
                {
                    **lookup[topic.id],
                    "children": build_children(topic.id),
                }
                for topic in ordered
            ]

        current = heads[0]
        ordered = []
        visited: set[int] = set()

        while current and current.id not in visited:
            visited.add(current.id)

            node = lookup[current.id]
            node["children"] = build_children(current.id)

            ordered.append(node)

            current = (
                sibling_lookup.get(current.next_id)
                if current.next_id is not None
                else None
            )

        return ordered

    return build_children(None)


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
