from app.db import engine
from app.dependencies import get_db
from app.models import User
from app.routers import auth, files, users
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ebb.stemmuslims.com",
        "https://stemmuslims-ebb.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(files.router)


@app.get("/")
def root():
    return {"message": "API working"}
