from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


class VideoStatus(str, Enum):
    PENDING = "PENDING"          # row created, nothing uploaded yet
    S3_UPLOADED = "S3_UPLOADED"  # in S3 but not yet on YouTube
    COMPLETED = "COMPLETED"      # in S3 and on YouTube
    FAILED = "FAILED"            # at least one step failed


class Video(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    title: str = Field(index=True)

    description: str = Field(default="")

    privacy_status: str = Field(default="unlisted")

    s3_key: str | None = Field(default=None)
    s3_url: str | None = Field(default=None)

    youtube_video_id: str | None = Field(default=None)
    youtube_url: str | None = Field(default=None)

    status: VideoStatus = Field(default=VideoStatus.PENDING, index=True)

    # human-readable summary of any step that failed (null when fully successful)
    error: str | None = Field(default=None)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
