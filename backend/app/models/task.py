from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel

from app.models.topic import TaskType


class TaskStatus(str, Enum):
    QUEUED = "QUEUED"            # posted to the to-do queue, unclaimed
    IN_PROGRESS = "IN_PROGRESS"  # claimed by a user, being worked on
    RELEASED = "RELEASED"        # given back by the user, awaiting admin requeue
    COMPLETED = "COMPLETED"      # deliverable uploaded


class Task(SQLModel, table=True):
    """A unit of work posted against a topic: either RECORDING (a teacher records
    the video) or TRANSLATION (a translator captions an existing video in a given
    language). Tasks flow through a single global queue; users claim them one at a
    time. The recording deliverable lands on the Topic; the translation caption
    lands here."""

    id: int | None = Field(default=None, primary_key=True)

    topic_id: int = Field(foreign_key="topic.id", index=True)

    task_type: TaskType = Field(index=True)

    # set for TRANSLATION tasks; the language the caption is for
    language_id: int | None = Field(default=None, foreign_key="language.id")

    status: TaskStatus = Field(default=TaskStatus.QUEUED, index=True)

    # email of the current holder (IN_PROGRESS) or last holder (RELEASED/COMPLETED)
    assignee_email: str | None = Field(default=None, index=True)

    # ordering within the QUEUED set; defaults to post order, admin-adjustable
    queue_order: int = Field(default=0, index=True)

    # translation deliverable (caption file in S3)
    caption_s3_key: str | None = Field(default=None)
    caption_s3_url: str | None = Field(default=None)

    requested_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    claimed_at: datetime | None = Field(default=None)
    released_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
