import time

from app.config import JWT_ALGORITHM, JWT_EXPIRY_SECONDS, JWT_SECRET
from jose import jwt


def create_access_token(email: str) -> str:
    return jwt.encode(
        {"sub": email, "exp": int(time.time()) + JWT_EXPIRY_SECONDS},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
