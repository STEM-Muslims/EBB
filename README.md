# React + FastAPI + Docker Project

A full-stack application using:

* React + TypeScript + Vite frontend
* FastAPI backend
* Docker + Docker Compose for development and deployment

---

# Project Structure

```text
.
├── backend/
│   ├── app/
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
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

A future `.env` file can be used for:

* Database URLs
* API keys
* Secrets
* Environment configuration

Example:

```env
BACKEND_PORT=8000
FRONTEND_PORT=5173
```

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

Ensure the backend Dockerfile uses:

```Dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

# Recommended Next Steps

* PostgreSQL integration
* SQLAlchemy models
* Alembic migrations
* Authentication (JWT)
* React Router
* TailwindCSS
* TanStack Query
* Production deployment

---

# License

Add your chosen license here.
