import os
import tempfile
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import AWS_REGION, S3_BUCKET_NAME, s3_client
from app.core.youtube import set_video_privacy, upload_video
from app.db import get_db
from app.dependencies import get_current_user, require_admin
from app.models.language import Language
from app.models.role import RoleType, UserRole
from app.models.task import Task, TaskStatus
from app.models.topic import LevelType, TaskType, Topic, VideoState
from app.models.user import User
from app.models.user_language import UserLanguage
from app.models.user_subject import UserTeachingSubject
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, SQLModel, col, select

router = APIRouter(prefix="/topics", tags=["topics"])

# Allowed parent level for each non-subject level (enforces the 4-level tree).
PARENT_LEVEL = {
    LevelType.MODULE: LevelType.SUBJECT,
    LevelType.CHAPTER: LevelType.MODULE,
    LevelType.TOPIC: LevelType.CHAPTER,
}


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


# ── Helpers ─────────────────────────────────────────────────────────────────


def _s3_url(key: str) -> str:
    return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"


def _step(success: bool, error: str | None = None) -> dict:
    return {"success": success, "error": error}


def get_topic_or_404(session: Session, topic_id: int) -> Topic:
    topic = session.get(Topic, topic_id)
    if not topic or not topic.is_active:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


def _user_has_role(session: Session, user: User, role: RoleType) -> bool:
    if user.is_admin:
        return True
    roles = session.exec(
        select(UserRole.role).where(UserRole.user_id == user.id)
    ).all()
    return role in roles


def _user_covers_language(session: Session, user: User, language_id: int) -> bool:
    if user.is_admin:
        return True
    link = session.exec(
        select(UserLanguage).where(
            UserLanguage.user_id == user.id,
            UserLanguage.language_id == language_id,
        )
    ).first()
    return link is not None


def _public_topic(topic: Topic, is_admin: bool) -> dict:
    """Serialise a topic, hiding the raw S3 location from non-admins."""
    data = topic.model_dump()
    if not is_admin:
        data["s3_key"] = None
        data["s3_url"] = None
    return data


def _ancestors(by_id: dict[int, Topic], topic: Topic) -> list[dict]:
    """Ordered list of a topic's ancestors, root (subject) first."""
    chain: list[dict] = []
    current = by_id.get(topic.parent_id) if topic.parent_id is not None else None
    while current is not None:
        chain.append(
            {
                "id": current.id,
                "name": current.name,
                "level_type": current.level_type,
            }
        )
        current = (
            by_id.get(current.parent_id) if current.parent_id is not None else None
        )
    chain.reverse()
    return chain


def subject_topic_id(by_id: dict[int, Topic], topic: Topic) -> int | None:
    """The id of the SUBJECT-level ancestor (or the topic itself if it is one)."""
    current: Topic | None = topic
    while current is not None:
        if current.level_type == LevelType.SUBJECT:
            return current.id
        current = (
            by_id.get(current.parent_id) if current.parent_id is not None else None
        )
    return None


def user_teaches_subject(session: Session, user: User, subject_id: int) -> bool:
    if user.is_admin:
        return True
    link = session.exec(
        select(UserTeachingSubject).where(
            UserTeachingSubject.user_id == user.id,
            UserTeachingSubject.topic_id == subject_id,
        )
    ).first()
    return link is not None


# ── Reordering (admin) ────────────────────────────────────────────────────────


@router.patch("/reorder")
def reorder_topics(
    req: TopicOrderUpdate,
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    if len(req.topic_ids) != len(set(req.topic_ids)):
        raise HTTPException(status_code=400, detail="topic_ids contains duplicates")

    siblings = session.exec(
        select(Topic).where(Topic.parent_id == req.parent_id, Topic.is_active)
    ).all()
    sibling_ids = {topic.id for topic in siblings}
    requested_ids = set(req.topic_ids)

    if sibling_ids != requested_ids:
        raise HTTPException(
            status_code=400,
            detail="topic_ids must contain all siblings exactly once",
        )

    topics_by_id = {topic.id: topic for topic in siblings}
    for i, topic_id in enumerate(req.topic_ids):
        topic = topics_by_id[topic_id]
        topic.prev_id = req.topic_ids[i - 1] if i > 0 else None
        topic.next_id = req.topic_ids[i + 1] if i < len(req.topic_ids) - 1 else None
        session.add(topic)

    session.commit()
    return {"ok": True}


# ── Reads (any authenticated user) ────────────────────────────────────────────


@router.get("/subjects", response_model=List[Topic])
def get_subjects(
    session: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    statement = (
        select(Topic)
        .where(Topic.level_type == LevelType.SUBJECT, Topic.is_active)
        .order_by(col(Topic.sort_order))
    )
    return session.exec(statement).all()


@router.get("/tree")
def get_tree(
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    topics = session.exec(select(Topic).where(Topic.is_active)).all()

    lookup = {
        t.id: {**_public_topic(t, user.is_admin), "children": []} for t in topics
    }

    by_parent: dict[int | None, list[Topic]] = {}
    for topic in topics:
        by_parent.setdefault(topic.parent_id, []).append(topic)

    def build_children(parent_id: int | None):
        siblings = by_parent.get(parent_id, [])
        if not siblings:
            return []

        sibling_lookup = {topic.id: topic for topic in siblings}
        heads = [topic for topic in siblings if topic.prev_id is None]

        if len(heads) != 1:
            ordered = sorted(siblings, key=lambda t: (t.sort_order, t.id))
            return [
                {**lookup[topic.id], "children": build_children(topic.id)}
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


@router.get("/completed")
def list_completed(
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The 'Videos Uploaded' view: every TOPIC whose video is COMPLETED, newest
    first, each with its subject/module/chapter breadcrumb. S3 links admin-only."""
    all_topics = session.exec(select(Topic).where(Topic.is_active)).all()
    by_id = {t.id: t for t in all_topics}

    completed = [
        t
        for t in all_topics
        if t.level_type == LevelType.TOPIC and t.video_state == VideoState.COMPLETED
    ]
    completed.sort(key=lambda t: t.video_uploaded_at or datetime.min, reverse=True)

    return [
        {**_public_topic(t, user.is_admin), "breadcrumb": _ancestors(by_id, t)}
        for t in completed
    ]


@router.get("/archived")
def list_archived(
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Soft-deleted topics, so an admin can review and restore them."""
    archived = session.exec(
        select(Topic).where(Topic.is_active == False)  # noqa: E712
    ).all()
    # Build a lookup over *all* topics so breadcrumbs resolve even when an
    # ancestor is also archived.
    all_topics = session.exec(select(Topic)).all()
    by_id = {t.id: t for t in all_topics}
    archived.sort(key=lambda t: t.updated_at or datetime.min, reverse=True)
    return [
        {**t.model_dump(), "breadcrumb": _ancestors(by_id, t)} for t in archived
    ]


@router.get("/{topic_id}/children", response_model=List[Topic])
def get_children(
    topic_id: int,
    session: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    parent = get_topic_or_404(session, topic_id)
    statement = (
        select(Topic)
        .where(Topic.parent_id == parent.id, Topic.is_active)
        .order_by(Topic.sort_order)
    )
    return session.exec(statement).all()


@router.get("/{topic_id}/detail")
def get_topic_detail(
    topic_id: int,
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """A topic with its ancestor breadcrumb and its tasks — backs the detail page."""
    topic = get_topic_or_404(session, topic_id)

    all_topics = session.exec(select(Topic).where(Topic.is_active)).all()
    by_id = {t.id: t for t in all_topics}

    tasks = session.exec(select(Task).where(Task.topic_id == topic.id)).all()
    task_out = []
    for t in tasks:
        language = (
            session.get(Language, t.language_id) if t.language_id else None
        )
        task_out.append(
            {**t.model_dump(), "language": language.model_dump() if language else None}
        )

    return {
        "topic": _public_topic(topic, user.is_admin),
        "breadcrumb": _ancestors(by_id, topic),
        "tasks": task_out,
    }


@router.get("/{topic_id}", response_model=Topic)
def get_topic(
    topic_id: int,
    session: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_topic_or_404(session, topic_id)


# ── Writes (admin only) ───────────────────────────────────────────────────────


@router.post("", response_model=Topic)
def create_topic(
    payload: TopicCreate,
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    if payload.level_type == LevelType.SUBJECT:
        if payload.parent_id is not None:
            raise HTTPException(400, "Subject cannot have a parent")
    else:
        if payload.parent_id is None:
            raise HTTPException(400, f"{payload.level_type.value} must have a parent")
        parent = get_topic_or_404(session, payload.parent_id)
        expected = PARENT_LEVEL[payload.level_type]
        if parent.level_type != expected:
            raise HTTPException(
                400,
                f"{payload.level_type.value} must sit under a "
                f"{expected.value} (got {parent.level_type.value})",
            )

    topic = Topic(
        name=payload.name,
        level_type=payload.level_type,
        parent_id=payload.parent_id,
        notes=payload.notes,
        sort_order=payload.sort_order,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(topic)
    session.commit()
    session.refresh(topic)
    return topic


@router.patch("/{topic_id}", response_model=Topic)
def update_topic(
    topic_id: int,
    payload: TopicUpdate,
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    topic = get_topic_or_404(session, topic_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(topic, key, value)
    topic.updated_at = datetime.now(timezone.utc)
    session.add(topic)
    session.commit()
    session.refresh(topic)
    return topic


@router.delete("/{topic_id}")
def delete_topic(
    topic_id: int,
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    topic = get_topic_or_404(session, topic_id)
    topic.is_active = False
    topic.updated_at = datetime.now(timezone.utc)
    session.add(topic)
    session.commit()
    return {"message": "deleted"}


@router.post("/{topic_id}/restore", response_model=Topic)
def restore_topic(
    topic_id: int,
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Un-archive a soft-deleted topic. Unlike other routes this must look up
    inactive rows, so it can't use get_topic_or_404."""
    topic = session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(404, "Topic not found")
    topic.is_active = True
    topic.updated_at = datetime.now(timezone.utc)
    session.add(topic)
    session.commit()
    session.refresh(topic)
    return topic


# ── Video upload / removal ────────────────────────────────────────────────────


@router.post("/{topic_id}/upload")
async def upload_topic_video(
    topic_id: int,
    file: UploadFile = File(...),
    title: str = Form(""),
    description: str = Form(""),
    privacy_status: str = Form("unlisted"),
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload (or hard-replace) the video for a topic. The holder of the topic's
    in-progress recording task (or an admin) may upload. Publishes to S3 + YouTube,
    records the result on the topic, and marks the recording task COMPLETED. Any
    previous video is taken down (S3 object deleted, old YouTube video privatised)."""
    topic = get_topic_or_404(session, topic_id)
    if topic.level_type != LevelType.TOPIC:
        raise HTTPException(400, "Only TOPIC-level items can hold a video")

    recording_task = session.exec(
        select(Task).where(
            Task.topic_id == topic.id,
            Task.task_type == TaskType.RECORDING,
            Task.status == TaskStatus.IN_PROGRESS,
        )
    ).first()
    if not user.is_admin:
        if not recording_task or recording_task.assignee_email != user.email:
            raise HTTPException(403, "This topic's recording task is not yours")

    old_s3_key = topic.s3_key
    old_youtube_id = topic.youtube_video_id

    steps = {
        "s3": _step(False, "not attempted"),
        "youtube": _step(False, "not attempted"),
        "database": _step(False, "not attempted"),
    }

    filename = file.filename or "video.mp4"
    s3_key = f"videos/{uuid.uuid4().hex}/{filename}"
    suffix = os.path.splitext(filename)[1]
    video_title = title.strip() or topic.name

    tmp_path: str | None = None
    s3_url: str | None = None
    youtube_video_id: str | None = None
    youtube_url: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            while chunk := await file.read(1024 * 1024):
                tmp.write(chunk)

        try:
            s3_client.upload_file(tmp_path, S3_BUCKET_NAME, s3_key)
            s3_url = _s3_url(s3_key)
            steps["s3"] = _step(True)
        except Exception as exc:  # noqa: BLE001
            steps["s3"] = _step(False, str(exc))

        try:
            result = upload_video(
                file_path=tmp_path,
                title=video_title,
                description=description,
                privacy_status=privacy_status,
            )
            youtube_video_id = result["id"]
            youtube_url = f"https://www.youtube.com/watch?v={youtube_video_id}"
            steps["youtube"] = _step(True)
        except Exception as exc:  # noqa: BLE001
            steps["youtube"] = _step(False, str(exc))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    uploaded_anything = steps["s3"]["success"] or steps["youtube"]["success"]
    failed = [name for name in ("s3", "youtube") if not steps[name]["success"]]
    error_summary = (
        None if not failed else "; ".join(f"{n}: {steps[n]['error']}" for n in failed)
    )

    try:
        if steps["s3"]["success"]:
            topic.s3_key = s3_key
            topic.s3_url = s3_url
        if steps["youtube"]["success"]:
            topic.youtube_video_id = youtube_video_id
            topic.youtube_url = youtube_url
        topic.uploaded_by = user.email
        topic.video_error = error_summary
        now = datetime.now(timezone.utc)
        if uploaded_anything:
            topic.video_state = VideoState.COMPLETED
            topic.video_uploaded_at = now
            if recording_task:
                recording_task.status = TaskStatus.COMPLETED
                recording_task.completed_at = now
                recording_task.updated_at = now
                session.add(recording_task)
        topic.updated_at = now
        session.add(topic)
        session.commit()
        session.refresh(topic)
        steps["database"] = _step(True)
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        steps["database"] = _step(False, str(exc))

    if steps["s3"]["success"] and old_s3_key and old_s3_key != s3_key:
        try:
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=old_s3_key)
        except Exception:  # noqa: BLE001
            pass
    if steps["youtube"]["success"] and old_youtube_id and old_youtube_id != youtube_video_id:
        try:
            set_video_privacy(old_youtube_id, "private")
        except Exception:  # noqa: BLE001
            pass

    success = all(step["success"] for step in steps.values())
    failed_steps = [name for name, step in steps.items() if not step["success"]]
    return {
        "success": success,
        "message": (
            "Video uploaded to S3, YouTube and recorded on the topic."
            if success
            else f"Upload incomplete — failed: {', '.join(failed_steps)}."
        ),
        "steps": steps,
        "topic": _public_topic(topic, user.is_admin),
    }


@router.delete("/{topic_id}/video")
def remove_topic_video(
    topic_id: int,
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Take a topic's video down: delete the S3 object, make the YouTube video
    private, and clear the video fields. The uploader or an admin may do this."""
    topic = get_topic_or_404(session, topic_id)
    if not user.is_admin and topic.uploaded_by != user.email:
        raise HTTPException(403, "You can only remove a video you uploaded")
    if topic.video_state != VideoState.COMPLETED:
        raise HTTPException(400, "This topic has no uploaded video")

    steps = {
        "s3": _step(True, None),
        "youtube": _step(True, None),
        "database": _step(False, "not attempted"),
    }

    if topic.s3_key:
        try:
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=topic.s3_key)
        except Exception as exc:  # noqa: BLE001
            steps["s3"] = _step(False, str(exc))
    if topic.youtube_video_id:
        try:
            set_video_privacy(topic.youtube_video_id, "private")
        except Exception as exc:  # noqa: BLE001
            steps["youtube"] = _step(False, str(exc))

    try:
        topic.s3_key = None
        topic.s3_url = None
        topic.youtube_video_id = None
        topic.youtube_url = None
        topic.uploaded_by = None
        topic.video_error = None
        topic.video_uploaded_at = None
        topic.video_state = VideoState.UNASSIGNED
        topic.updated_at = datetime.now(timezone.utc)
        session.add(topic)
        session.commit()
        steps["database"] = _step(True)
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        steps["database"] = _step(False, str(exc))

    success = all(step["success"] for step in steps.values())
    failed_steps = [name for name, step in steps.items() if not step["success"]]
    return {
        "success": success,
        "message": (
            "Video removed and the topic reset."
            if success
            else f"Removal incomplete — failed: {', '.join(failed_steps)}."
        ),
        "steps": steps,
    }
