import os
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.core.config import S3_BUCKET_NAME, s3_client
from app.db import get_db
from app.dependencies import get_current_user, require_admin
from app.models.language import Language
from app.models.task import Task, TaskStatus
from app.models.topic import LevelType, TaskType, Topic, VideoState
from app.models.user import User
from app.routers.topics import (
    _ancestors,
    _s3_url,
    _step,
    _user_covers_language,
    get_topic_or_404,
    subject_topic_id,
    user_teaches_subject,
)
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, SQLModel, col, select

router = APIRouter(prefix="/tasks", tags=["tasks"])

# A task is "open" (not yet finished) in any of these states.
OPEN_STATES = (TaskStatus.QUEUED, TaskStatus.IN_PROGRESS, TaskStatus.RELEASED)


class TaskCreate(SQLModel):
    topic_id: int
    task_type: TaskType
    language_id: Optional[int] = None


class QueueReorder(SQLModel):
    task_ids: list[int]


# ── Helpers ─────────────────────────────────────────────────────────────────


def _topics_by_id(session: Session) -> dict[int, Topic]:
    return {t.id: t for t in session.exec(select(Topic)).all()}


def _enrich(session: Session, task: Task, by_id: dict[int, Topic]) -> dict:
    topic = by_id.get(task.topic_id)
    language = session.get(Language, task.language_id) if task.language_id else None
    return {
        **task.model_dump(),
        "topic_name": topic.name if topic else None,
        "breadcrumb": _ancestors(by_id, topic) if topic else [],
        "language": language.model_dump() if language else None,
    }


def _eligible(session: Session, user: User, task: Task, by_id: dict[int, Topic]) -> bool:
    """Whether a user is allowed to take a task (admins always are)."""
    if user.is_admin:
        return True
    if task.task_type == TaskType.RECORDING:
        topic = by_id.get(task.topic_id)
        if topic is None:
            return False
        sid = subject_topic_id(by_id, topic)
        return sid is not None and user_teaches_subject(session, user, sid)
    return task.language_id is not None and _user_covers_language(
        session, user, task.language_id
    )


def _active_task(session: Session, email: str) -> Task | None:
    return session.exec(
        select(Task).where(
            Task.assignee_email == email, Task.status == TaskStatus.IN_PROGRESS
        )
    ).first()


def _next_queue_order(session: Session) -> int:
    current = session.exec(select(col(Task.queue_order))).all()
    return (max(current) + 1) if current else 0


def _get_task_or_404(session: Session, task_id: int) -> Task:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task


# ── Post a task (admin) ───────────────────────────────────────────────────────


@router.post("")
def post_task(
    payload: TaskCreate,
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    topic = get_topic_or_404(session, payload.topic_id)
    if topic.level_type != LevelType.TOPIC:
        raise HTTPException(400, "Only TOPIC-level items can hold a task")

    existing_open = session.exec(
        select(Task).where(
            Task.topic_id == topic.id,
            Task.task_type == payload.task_type,
            col(Task.status).in_(OPEN_STATES),
        )
    ).all()

    if payload.task_type == TaskType.RECORDING:
        if existing_open:
            raise HTTPException(400, "An open recording task already exists")
        language_id = None
    else:  # TRANSLATION
        if topic.video_state != VideoState.COMPLETED:
            raise HTTPException(
                400, "The video must be uploaded before a translation task"
            )
        if payload.language_id is None:
            raise HTTPException(400, "Translation tasks require a language_id")
        language = session.get(Language, payload.language_id)
        if not language or not language.is_active:
            raise HTTPException(404, "Language not found")
        if any(t.language_id == payload.language_id for t in existing_open):
            raise HTTPException(
                400, "An open translation task for that language already exists"
            )
        language_id = payload.language_id

    now = datetime.now(timezone.utc)
    task = Task(
        topic_id=topic.id,
        task_type=payload.task_type,
        language_id=language_id,
        status=TaskStatus.QUEUED,
        queue_order=_next_queue_order(session),
        requested_at=now,
        created_at=now,
        updated_at=now,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return _enrich(session, task, _topics_by_id(session))


# ── Queue / lists ─────────────────────────────────────────────────────────────


@router.get("/queue")
def get_queue(
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The to-do queue, oldest first. Non-admins see only tasks they're eligible
    for; this drives the get-task offer loop on the client."""
    by_id = _topics_by_id(session)
    queued = session.exec(
        select(Task)
        .where(Task.status == TaskStatus.QUEUED)
        .order_by(col(Task.queue_order))
    ).all()
    visible = [t for t in queued if _eligible(session, user, t, by_id)]
    return [_enrich(session, t, by_id) for t in visible]


@router.get("/queue/all")
def get_full_queue(
    session: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """The full to-do queue (every QUEUED task), for visibility only. Claiming
    still goes through /queue + /claim, which enforce eligibility."""
    by_id = _topics_by_id(session)
    queued = session.exec(
        select(Task)
        .where(Task.status == TaskStatus.QUEUED)
        .order_by(col(Task.queue_order))
    ).all()
    return [_enrich(session, t, by_id) for t in queued]


@router.get("/in-progress")
def get_in_progress(
    session: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Tasks currently being worked on, visible to everyone."""
    by_id = _topics_by_id(session)
    rows = session.exec(
        select(Task)
        .where(Task.status == TaskStatus.IN_PROGRESS)
        .order_by(col(Task.claimed_at))
    ).all()
    return [_enrich(session, t, by_id) for t in rows]


@router.get("/mine")
def get_mine(
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The caller's current task(s) — their working-on section."""
    by_id = _topics_by_id(session)
    rows = session.exec(
        select(Task).where(
            Task.assignee_email == user.email,
            Task.status == TaskStatus.IN_PROGRESS,
        )
    ).all()
    return [_enrich(session, t, by_id) for t in rows]


@router.get("/released")
def get_released(
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Released tasks awaiting an admin to requeue them."""
    by_id = _topics_by_id(session)
    rows = session.exec(
        select(Task)
        .where(Task.status == TaskStatus.RELEASED)
        .order_by(col(Task.released_at).desc())
    ).all()
    return [_enrich(session, t, by_id) for t in rows]


# ── Reorder the queue (admin) ─────────────────────────────────────────────────


@router.patch("/queue/reorder")
def reorder_queue(
    req: QueueReorder,
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    if len(req.task_ids) != len(set(req.task_ids)):
        raise HTTPException(400, "task_ids contains duplicates")

    queued = session.exec(
        select(Task).where(Task.status == TaskStatus.QUEUED)
    ).all()
    queued_ids = {t.id for t in queued}
    if queued_ids != set(req.task_ids):
        raise HTTPException(400, "task_ids must contain all queued tasks exactly once")

    by_id = {t.id: t for t in queued}
    for i, task_id in enumerate(req.task_ids):
        task = by_id[task_id]
        task.queue_order = i
        task.updated_at = datetime.now(timezone.utc)
        session.add(task)
    session.commit()
    return {"ok": True}


# ── Claim / release / requeue ─────────────────────────────────────────────────


@router.post("/{task_id}/claim")
def claim_task(
    task_id: int,
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task_or_404(session, task_id)
    if task.status != TaskStatus.QUEUED:
        raise HTTPException(400, "This task is no longer available")
    by_id = _topics_by_id(session)
    if not _eligible(session, user, task, by_id):
        raise HTTPException(403, "You aren't eligible for this task")
    if _active_task(session, user.email):
        raise HTTPException(400, "Finish or release your current task first")

    now = datetime.now(timezone.utc)
    task.status = TaskStatus.IN_PROGRESS
    task.assignee_email = user.email
    task.claimed_at = now
    task.updated_at = now
    session.add(task)
    session.commit()
    session.refresh(task)
    return _enrich(session, task, by_id)


@router.post("/{task_id}/release")
def release_task(
    task_id: int,
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task_or_404(session, task_id)
    if task.status != TaskStatus.IN_PROGRESS:
        raise HTTPException(400, "Only an in-progress task can be released")
    if not user.is_admin and task.assignee_email != user.email:
        raise HTTPException(403, "This task is not yours")

    now = datetime.now(timezone.utc)
    task.status = TaskStatus.RELEASED
    task.released_at = now
    task.updated_at = now
    session.add(task)
    session.commit()
    session.refresh(task)
    return _enrich(session, task, _topics_by_id(session))


@router.post("/{task_id}/requeue")
def requeue_task(
    task_id: int,
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    task = _get_task_or_404(session, task_id)
    if task.status != TaskStatus.RELEASED:
        raise HTTPException(400, "Only a released task can be requeued")

    now = datetime.now(timezone.utc)
    task.status = TaskStatus.QUEUED
    task.assignee_email = None
    task.claimed_at = None
    task.released_at = None
    task.queue_order = _next_queue_order(session)
    task.updated_at = now
    session.add(task)
    session.commit()
    session.refresh(task)
    return _enrich(session, task, _topics_by_id(session))


# ── Translation caption upload ────────────────────────────────────────────────


@router.post("/{task_id}/caption")
async def upload_caption(
    task_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload the caption file for a translation task (the holder or an admin)."""
    task = _get_task_or_404(session, task_id)
    if task.task_type != TaskType.TRANSLATION:
        raise HTTPException(400, "Only translation tasks take a caption")
    if task.status != TaskStatus.IN_PROGRESS:
        raise HTTPException(400, "Claim the task before uploading a caption")
    if not user.is_admin and task.assignee_email != user.email:
        raise HTTPException(403, "This task is not yours")

    filename = file.filename or "captions.vtt"
    s3_key = f"captions/{uuid.uuid4().hex}/{filename}"
    suffix = os.path.splitext(filename)[1]
    old_key = task.caption_s3_key

    tmp_path: str | None = None
    step = _step(False, "not attempted")
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            while chunk := await file.read(1024 * 1024):
                tmp.write(chunk)
        try:
            s3_client.upload_file(tmp_path, S3_BUCKET_NAME, s3_key)
            step = _step(True)
        except Exception as exc:  # noqa: BLE001
            step = _step(False, str(exc))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    if not step["success"]:
        raise HTTPException(502, f"Caption upload failed: {step['error']}")

    now = datetime.now(timezone.utc)
    task.caption_s3_key = s3_key
    task.caption_s3_url = _s3_url(s3_key)
    task.status = TaskStatus.COMPLETED
    task.completed_at = now
    task.updated_at = now
    session.add(task)
    session.commit()
    session.refresh(task)

    if old_key and old_key != s3_key:
        try:
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=old_key)
        except Exception:  # noqa: BLE001
            pass

    return _enrich(session, task, _topics_by_id(session))
