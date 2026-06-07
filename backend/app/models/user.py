from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str | None = Field(default=None)
    google_id: str | None = Field(default=None, index=True)
    is_admin: bool | None = Field(default=False)
