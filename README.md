# EBB — Education Beyond Borders

A full-stack web app for managing educational content (subjects, topics, videos),
with an admin area behind Google OAuth or email/password sign-in.

Tech stack:

* React 19 + TypeScript + Vite + Tailwind CSS frontend (deployed to Netlify)
* FastAPI + SQLModel + PostgreSQL + Alembic backend (deployed to Koyeb via Docker)
* AWS S3 for file uploads
* Docker + Docker Compose for local development

---

# Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── core/config.py    # DATABASE_URL + AWS S3 client
│   │   ├── models/           # User, Topic SQLModel tables
│   │   ├── routers/          # auth, users, files, topics
│   │   ├── config.py         # OAuth + JWT settings
│   │   ├── db.py             # engine + session
│   │   ├── dependencies.py   # get_db, require_admin
│   │   └── main.py           # FastAPI app + CORS
│   ├── alembic/              # DB migrations
│   ├── seed_admin.py         # bootstrap the first admin
│   ├── dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
├── netlify.toml              # frontend deploy config
├── railway.toml              # backend deploy config (legacy)
├── .env.example
├── .gitignore
└── README.md
```

---

# Requirements

Install the following before starting:

* Docker
* Docker Compose
* Git

# Getting Started

## Start the application

From the project root:

```bash
docker compose up --build
```

This will:

* Build the frontend container
* Build the backend container
* Start both services

---

# Application URLs

Once running:

| Service      | URL                                                      |
| ------------ | -------------------------------------------------------- |
| Frontend     | [http://localhost:5173](http://localhost:5173)           |
| Backend API  | [http://localhost:8000](http://localhost:8000)           |
| FastAPI Docs | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

# Stopping the Application

```bash
docker compose down
```

---

# Rebuilding Containers

If dependencies or Dockerfiles change:

```bash
docker compose up --build
```

---

# Backend Development

## Backend Stack

* FastAPI
* Uvicorn
* Python 3.11

## Install Backend Dependencies Locally (Optional)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run Backend Without Docker (Optional)

```bash
uvicorn app.main:app --reload
```

---

# Frontend Development

## Frontend Stack

* React
* TypeScript
* Vite

## Install Frontend Dependencies Locally (Optional)

```bash
cd frontend
npm install
```

## Run Frontend Without Docker (Optional)

```bash
npm run dev
```

---

# Docker Notes

The project uses Docker volumes for development.

This means:

* Code changes automatically update inside containers
* You usually do not need to rebuild after editing source files
* Rebuilds are only needed when dependencies change

---

# Useful Commands

## View Running Containers

```bash
docker compose ps
```

## View Logs

```bash
docker compose logs -f
```

## Rebuild From Scratch

```bash
docker compose down

docker compose up --build
```

## Remove Old Containers

```bash
docker container prune
```

---

# Environment Variables

Copy the examples and fill them in:

```bash
cp .env.example .env                  # backend (Postgres, AWS S3, OAuth, JWT, URLs)
cp frontend/.env.example frontend/.env # frontend (VITE_API_URL)
```

Admin access is **database-driven** (the `is_admin` column on a user row), not an
env whitelist. Seed the first admin on a fresh DB:

```bash
docker compose exec backend python seed_admin.py you@example.com
```

See `CLAUDE.md` for the full list of variables and what each one does.

---

# Common Issues

## Port Already Allocated

If Docker reports:

```text
Bind for 0.0.0.0:8000 failed: port is already allocated
```

Kill the process using the port:

```bash
sudo fuser -k 8000/tcp
sudo fuser -k 5173/tcp
```

Then restart:

```bash
docker compose up --build
```

---

## Frontend Shows Blank Page

Check:

* Browser console (`F12`)
* Docker logs
* `frontend/src/main.tsx`

---

## Backend Import Errors

Ensure the backend Dockerfile runs migrations then starts the server:

```Dockerfile
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

---

# Deployment

* **Frontend** → Netlify (config in `netlify.toml`: base `frontend`, build `npm run build`, publish `dist`)
* **Backend** → Koyeb, Docker-based (`backend/dockerfile`); runs `alembic upgrade head` then `uvicorn` on startup
* Set `BACKEND_URL` to the deployed backend URL and register `<BACKEND_URL>/auth/google/callback` as an authorized redirect URI in the Google Cloud Console

---

# License

Add your chosen license here.
