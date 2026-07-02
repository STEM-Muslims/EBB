from sqlmodel import Field, SQLModel, UniqueConstraint


class UserTeachingSubject(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uq_user_teaching_subject"),
    )

    id: int | None = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", index=True)

    topic_id: int = Field(foreign_key="topic.id", index=True)
