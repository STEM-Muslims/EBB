from app.db import engine
from app.dependencies import get_db
from app.models import User
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, select

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "API working"}


@app.get("/db-test")
def db_test(session: Session = Depends(get_db)):
    return {"ok": True}


@app.get("/users")
def get_users(session: Session = Depends(get_db)):
    return session.exec(select(User)).all()
