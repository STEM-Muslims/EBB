from datetime import datetime, timezone
from enum import Enum
from math import nextafter

from sqlmodel import Field, SQLModel


class LevelType(str, Enum):
    SUBJECT = "SUBJECT"
    TOPIC = "TOPIC"
    VIDEO = "VIDEO"


class Topic(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    name: str = Field(index=True)

    level_type: LevelType = Field(index=True)

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

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
