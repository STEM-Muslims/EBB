from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


class LevelType(str, Enum):
    SUBJECT = "SUBJECT"
    MODULE = "MODULE"
    CHAPTER = "CHAPTER"
    TOPIC = "TOPIC"


class TopicSource(str, Enum):
    SYSTEM = "SYSTEM"  # seeded from code (the canonical subjects)
    USER = "USER"      # created in-app by an admin


class VideoState(str, Enum):
    UNASSIGNED = "UNASSIGNED"  # no recording task posted yet
    ASSIGNED = "ASSIGNED"      # a teacher has been assigned, awaiting upload
    COMPLETED = "COMPLETED"    # the video has been uploaded


class TaskType(str, Enum):
    RECORDING = "RECORDING"      # a teacher records & uploads the video
    TRANSLATION = "TRANSLATION"  # a translator captions an existing video


class Topic(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    name: str = Field(index=True)

    level_type: LevelType = Field(index=True)

    # SYSTEM for the code-seeded subjects, USER for everything created in-app.
    source: TopicSource = Field(default=TopicSource.USER, index=True)

    parent_id: int | None = Field(
        default=None,
        foreign_key="topic.id",
        index=True,
    )

    sort_order: int = Field(default=0)

    notes: str | None = Field(default=None)

    is_active: bool = Field(default=True)

    prev_id: int | None = Field(
        default=None,
        foreign_key="topic.id",
        index=True,
    )

    next_id: int | None = Field(
        default=None,
        foreign_key="topic.id",
        index=True,
    )

    # ── Video (one per TOPIC leaf) ──────────────────────────────────────────
    # The video is modelled as a property of the topic, not a separate row.
    # UNASSIGNED = no video yet, COMPLETED = a video has been uploaded. The
    # assignment workflow lives in the Task table, not here.
    video_state: VideoState = Field(default=VideoState.UNASSIGNED, index=True)

    s3_key: str | None = Field(default=None)
    s3_url: str | None = Field(default=None)

    youtube_video_id: str | None = Field(default=None)
    youtube_url: str | None = Field(default=None)

    # email of whoever uploaded the current video
    uploaded_by: str | None = Field(default=None, index=True)

    # human-readable summary of any upload step that failed (null when clean)
    video_error: str | None = Field(default=None)

    video_uploaded_at: datetime | None = Field(default=None)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
