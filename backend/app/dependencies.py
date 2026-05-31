from app.db import engine
from fastapi import Depends
from sqlmodel import Session


def get_db():
    with Session(engine) as session:
        yield session
