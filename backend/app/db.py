from app.core.config import DATABASE_URL
from sqlmodel import Session, create_engine

engine = create_engine(DATABASE_URL, echo=True)


def get_db():
    with Session(engine) as session:
        yield session
