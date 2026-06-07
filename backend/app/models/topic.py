from datetime import datetime
from enum import Enum

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

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
