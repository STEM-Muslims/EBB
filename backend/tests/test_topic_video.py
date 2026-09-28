from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import Session

from app.db import engine, get_db
from app.main import app
from app.models import LevelType, Task, TaskStatus, TaskType, Topic, VideoState

TEACHER = "teacher@example.com"
ADMIN = "admin@example.com"
VIDEO = {"file": ("lesson.mp4", b"fake video bytes", "video/mp4")}


def _topic(session: Session, **video_fields) -> Topic:
    topic = Topic(name="Fractions", level_type=LevelType.TOPIC, **video_fields)
    session.add(topic)
    session.commit()
    session.refresh(topic)
    return topic


def _recording_task(session: Session, topic: Topic, status: TaskStatus, **fields) -> Task:
    task = Task(
        topic_id=topic.id,
        task_type=TaskType.RECORDING,
        status=status,
        assignee_email=TEACHER if status != TaskStatus.QUEUED else None,
        **fields,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def _reload(session: Session, obj):
    session.expire_all()
    return session.get(type(obj), obj.id)


def _uploaded_key(s3) -> str:
    """The S3 key the handler uploaded the new video to."""
    return s3.upload_file.call_args.args[2]


@pytest.fixture
def teacher_task(session, login):
    """A fresh TOPIC with the teacher holding its IN_PROGRESS recording task."""
    login(TEACHER)
    topic = _topic(session)
    task = _recording_task(session, topic, TaskStatus.IN_PROGRESS)
    return topic, task


# ── Upload: success ───────────────────────────────────────────────────────────


def test_upload_success_records_video_and_completes_task(
    client, session, s3, youtube, teacher_task
):
    topic, task = teacher_task

    res = client.post(f"/topics/{topic.id}/upload", files=VIDEO)

    assert res.status_code == 200
    assert res.json()["success"] is True
    topic = _reload(session, topic)
    assert topic.video_state == VideoState.COMPLETED
    assert topic.s3_key == _uploaded_key(s3)
    assert topic.youtube_video_id == "new-yt-id"
    assert topic.uploaded_by == TEACHER
    assert topic.video_error is None
    assert _reload(session, task).status == TaskStatus.COMPLETED
    s3.delete_object.assert_not_called()


# ── Upload: each failure point leaves the task open and cleans up ─────────────


def test_s3_failure_skips_youtube_and_keeps_task_open(
    client, session, s3, youtube, teacher_task
):
    topic, task = teacher_task
    s3.upload_file.side_effect = RuntimeError("AccessDenied")

    res = client.post(f"/topics/{topic.id}/upload", files=VIDEO)

    assert res.status_code == 502
    assert "S3 upload failed: AccessDenied" in res.json()["detail"]
    youtube.upload.assert_not_called()
    topic = _reload(session, topic)
    assert topic.video_state == VideoState.UNASSIGNED
    assert topic.s3_key is None
    assert topic.uploaded_by is None
    assert "AccessDenied" in topic.video_error
    assert _reload(session, task).status == TaskStatus.IN_PROGRESS


def test_youtube_failure_deletes_new_s3_object_and_keeps_task_open(
    client, session, s3, youtube, teacher_task
):
    topic, task = teacher_task
    youtube.upload.side_effect = RuntimeError("invalid_grant")

    res = client.post(f"/topics/{topic.id}/upload", files=VIDEO)

    assert res.status_code == 502
    assert "YouTube upload failed: invalid_grant" in res.json()["detail"]
    s3.delete_object.assert_called_once_with(
        Bucket="test-bucket", Key=_uploaded_key(s3)
    )
    topic = _reload(session, topic)
    assert topic.video_state == VideoState.UNASSIGNED
    assert topic.s3_key is None
    assert topic.youtube_video_id is None
    assert "invalid_grant" in topic.video_error
    assert _reload(session, task).status == TaskStatus.IN_PROGRESS


class _CommitFailsOnce(Session):
    """A session whose first commit fails, as if the DB dropped mid-request."""

    failed = False

    def commit(self):
        if not self.failed:
            self.failed = True
            raise RuntimeError("database is down")
        super().commit()


def test_db_failure_undoes_both_uploads_and_keeps_task_open(
    client, session, s3, youtube, teacher_task
):
    topic, task = teacher_task

    def failing_db():
        with _CommitFailsOnce(engine) as s:
            yield s

    app.dependency_overrides[get_db] = failing_db

    res = client.post(f"/topics/{topic.id}/upload", files=VIDEO)

    assert res.status_code == 502
    assert "Saving the upload failed" in res.json()["detail"]
    s3.delete_object.assert_called_once_with(
        Bucket="test-bucket", Key=_uploaded_key(s3)
    )
    youtube.set_privacy.assert_called_once_with("new-yt-id", "private")
    topic = _reload(session, topic)
    assert topic.video_state == VideoState.UNASSIGNED
    assert topic.s3_key is None
    assert topic.youtube_video_id is None
    assert _reload(session, task).status == TaskStatus.IN_PROGRESS


# ── Upload: replacing an existing video ───────────────────────────────────────

OLD_VIDEO = dict(
    video_state=VideoState.COMPLETED,
    s3_key="videos/old/lesson.mp4",
    s3_url="https://old",
    youtube_video_id="old-yt-id",
    youtube_url="https://www.youtube.com/watch?v=old-yt-id",
    uploaded_by=TEACHER,
)


def test_failed_replacement_keeps_the_previous_video(
    client, session, s3, youtube, login
):
    login(ADMIN, is_admin=True)
    topic = _topic(session, **OLD_VIDEO)
    youtube.upload.side_effect = RuntimeError("quotaExceeded")

    res = client.post(f"/topics/{topic.id}/upload", files=VIDEO)

    assert res.status_code == 502
    topic = _reload(session, topic)
    assert topic.video_state == VideoState.COMPLETED
    assert topic.s3_key == "videos/old/lesson.mp4"
    assert topic.youtube_video_id == "old-yt-id"
    # Only the new, orphaned S3 object is cleaned up; the old video is untouched.
    s3.delete_object.assert_called_once_with(
        Bucket="test-bucket", Key=_uploaded_key(s3)
    )
    youtube.set_privacy.assert_not_called()


def test_successful_replacement_takes_down_the_previous_video(
    client, session, s3, youtube, login
):
    login(ADMIN, is_admin=True)
    topic = _topic(session, **OLD_VIDEO)

    res = client.post(f"/topics/{topic.id}/upload", files=VIDEO)

    assert res.status_code == 200
    topic = _reload(session, topic)
    assert topic.youtube_video_id == "new-yt-id"
    assert topic.uploaded_by == ADMIN
    s3.delete_object.assert_called_once_with(
        Bucket="test-bucket", Key="videos/old/lesson.mp4"
    )
    youtube.set_privacy.assert_called_once_with("old-yt-id", "private")


# ── Removal requeues the recording task ───────────────────────────────────────


def test_removing_a_video_requeues_its_recording_task(
    client, session, s3, youtube, login
):
    login(TEACHER)
    topic = _topic(session, **OLD_VIDEO)
    other = _topic(session)
    _recording_task(session, other, TaskStatus.QUEUED, queue_order=5)
    task = _recording_task(
        session,
        topic,
        TaskStatus.COMPLETED,
        claimed_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )

    res = client.delete(f"/topics/{topic.id}/video")

    assert res.status_code == 200
    assert _reload(session, topic).video_state == VideoState.UNASSIGNED
    task = _reload(session, task)
    assert task.status == TaskStatus.QUEUED
    assert task.assignee_email is None
    assert task.claimed_at is None
    assert task.completed_at is None
    assert task.queue_order == 6  # back of the queue


def test_removing_a_video_leaves_a_newer_open_task_alone(
    client, session, s3, youtube, login
):
    login(ADMIN, is_admin=True)
    topic = _topic(session, **OLD_VIDEO)
    earlier = datetime.now(timezone.utc) - timedelta(days=1)
    old_task = _recording_task(
        session, topic, TaskStatus.COMPLETED, created_at=earlier
    )
    new_task = _recording_task(session, topic, TaskStatus.QUEUED)

    res = client.delete(f"/topics/{topic.id}/video")

    assert res.status_code == 200
    assert _reload(session, old_task).status == TaskStatus.COMPLETED
    assert _reload(session, new_task).status == TaskStatus.QUEUED
