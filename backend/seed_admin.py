"""Seed (or promote) an admin user.

Solves the bootstrap problem: every user-creation endpoint requires an existing
admin, so the very first admin on a fresh database has to be created out-of-band.

Reads the email from BOOTSTRAP_ADMIN_EMAIL (or the first CLI arg) and upserts a
row with is_admin=True. An optional BOOTSTRAP_ADMIN_PASSWORD sets a bcrypt hash;
it is not needed for Google sign-in (google_id fills in on first login).

Usage:
    BOOTSTRAP_ADMIN_EMAIL=you@example.com python seed_admin.py
    python seed_admin.py you@example.com

    # via docker compose
    docker compose exec backend python seed_admin.py you@example.com
"""

import os
import sys

from app.db import engine
from app.models.user import User
from passlib.context import CryptContext
from sqlmodel import Session, select

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_admin(email: str, password: str | None = None) -> None:
    email = email.strip().lower()
    if not email:
        raise SystemExit("error: empty email")

    hashed = _pwd_context.hash(password) if password else None

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            user.is_admin = True
            if hashed:
                user.hashed_password = hashed
            action = "promoted existing user to admin"
        else:
            user = User(email=email, is_admin=True, hashed_password=hashed)
            session.add(user)
            action = "created new admin user"
        session.commit()

    print(f"{action}: {email}")


if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else os.getenv("BOOTSTRAP_ADMIN_EMAIL", "")
    if not email:
        raise SystemExit(
            "error: provide an email via argument or BOOTSTRAP_ADMIN_EMAIL"
        )
    seed_admin(email, os.getenv("BOOTSTRAP_ADMIN_PASSWORD"))
