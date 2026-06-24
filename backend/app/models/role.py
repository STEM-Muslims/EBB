from enum import Enum

from sqlmodel import Field, SQLModel, UniqueConstraint


class RoleType(str, Enum):
    TEACHER = "TEACHER"
    TRANSLATOR = "TRANSLATOR"


class UserRole(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "role", name="uq_user_role"),)

    id: int | None = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id", index=True)

    role: RoleType = Field(index=True)
