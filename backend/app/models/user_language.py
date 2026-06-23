from sqlmodel import Field, SQLModel, UniqueConstraint


class UserLanguage(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("user_id", "language_id", name="uq_user_language"),
    )

    id: int | None = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", index=True)

    language_id: int = Field(foreign_key="language.id", index=True)
