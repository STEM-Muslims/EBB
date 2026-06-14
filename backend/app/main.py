from app.routers import auth, files, topics, users, youtube
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(files.router)
app.include_router(topics.router)
app.include_router(youtube.router)


@app.get("/")
def root():
    return {"message": "API working"}
