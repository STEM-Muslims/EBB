import os
import tempfile

# Point the app at a throwaway SQLite DB and dummy AWS settings *before* any app
# module is imported (they read these at import time). Force-set, never default,
# so a DATABASE_URL in the shell can't send tests to a real database.
_db_dir = tempfile.mkdtemp(prefix="ebb-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_db_dir, 'test.db')}"
os.environ["AWS_REGION"] = "eu-west-2"
os.environ["AWS_S3_ACCESS_KEY"] = "test"
os.environ["AWS_S3_SECRET_ACCESS_KEY"] = "test"
os.environ["S3_BUCKET_NAME"] = "test-bucket"

from unittest.mock import MagicMock  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session, SQLModel  # noqa: E402

import app.models  # noqa: E402,F401  (registers every table on the metadata)
from app.db import engine  # noqa: E402
from app.dependencies import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.routers import topics as topics_router  # noqa: E402


@pytest.fixture
def session():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def s3(monkeypatch):
    mock = MagicMock()
    monkeypatch.setattr(topics_router, "s3_client", mock)
    return mock


@pytest.fixture
def youtube(monkeypatch):
    """Mocks for the YouTube client: `upload` returns a new video id by default."""
    upload = MagicMock(return_value={"id": "new-yt-id"})
    set_privacy = MagicMock()
    monkeypatch.setattr(topics_router, "upload_video", upload)
    monkeypatch.setattr(topics_router, "set_video_privacy", set_privacy)
    return MagicMock(upload=upload, set_privacy=set_privacy)


@pytest.fixture
def login():
    """Call login(email, is_admin=False) to make requests as that user."""

    def _login(email: str, is_admin: bool = False) -> None:
        app.dependency_overrides[get_current_user] = lambda: User(
            id=1, email=email, is_admin=is_admin
        )

    yield _login
    app.dependency_overrides.clear()


@pytest.fixture
def client(session):
    return TestClient(app)
