# AI Agent Instructions for EBB (Education Beyond Borders)

Welcome to the EBB project! This file provides context, rules, and architectural guidelines for AI coding agents (like Copilot, Cursor, Zed, or Claude) assisting with this repository.

## Project Overview
EBB (Education Beyond Borders) is a full-stack web application for managing educational content such as subjects, topics, and videos. It includes a user-facing platform and a secure admin area behind Google OAuth or email/password sign-in.

## Architecture & Tech Stack

### Frontend (`/frontend`)
*   **Framework**: React 19 + Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS (paired with SCSS modules as per the design spec)
*   **Routing**: React Router v7
*   **Key Libraries**: React Router v7; `@dnd-kit` is still a declared dependency but is no longer imported anywhere
*   **Deployment**: Netlify (`netlify.toml` in the root)

### Backend (`/backend`)
*   **Framework**: FastAPI (Python 3.11)
*   **ORM**: SQLModel + SQLAlchemy
*   **Database**: PostgreSQL
*   **Migrations**: Alembic (`/backend/alembic`)
*   **Key Services**: AWS S3 (file uploads), YouTube API client, Google OAuth
*   **Deployment**: Dockerized (deployed to Koyeb)

### Infrastructure
*   **Local Development**: Docker + Docker Compose (`docker-compose.yml`)

## Design & UI/UX Guidelines
The visual language for this project is strictly defined in `DESIGN_SPEC.md`. 
*   **Crucial Note**: The design spec references Next.js, but **this project uses Vite + React**. Apply the design patterns, color palettes, CSS/Tailwind rules, and animations described in `DESIGN_SPEC.md`, but implement them using standard React/Vite paradigms (e.g., React Router instead of Next.js App Router).
*   **Aesthetic**: Clean, calm, professional. Muted sage/teal green with warm gold accents.
*   **Typography**: Inter (sans-serif) for body text and a decorative serif (like Cinzel Decorative) for headings.

## Coding Rules & Conventions

### Frontend Rules
1.  **TypeScript First**: Use strict TypeScript typing for all components and utilities.
2.  **Environment Variables**: Since we use Vite, access environment variables via `import.meta.env.VITE_*`.
3.  **Components**: Favor functional components and React hooks. Keep components modular and reusable.
4.  **Styling**: Use Tailwind CSS for utility-first styling. For complex, component-specific styles, use SCSS modules as outlined in the design spec.

### Backend Rules
1.  **FastAPI Best Practices**: Utilize Pydantic/SQLModel for request/response validation and database modeling.
2.  **Dependency Injection**: Use FastAPI's `Depends` for things like database sessions (`get_db`), current user retrieval, and role validation.
3.  **Migrations**: Never modify the database schema without generating a corresponding Alembic migration (`alembic revision --autogenerate`).
4.  **Admin Authorization**: Admin rights are database-driven (`is_admin` column), not env-based. Ensure `require_admin` dependencies are used on protected routes.

### General Agent Behavior
*   **Run Validations**: If you make a database change, suggest or write the Alembic migration.
*   **Docker Volumes**: Remember that the local dev environment uses Docker volumes. Code changes reflect automatically, but dependency changes (`package.json` or `requirements.txt`) require a container rebuild (`docker compose up --build`).
*   **Read the Docs**: Before modifying UI components, re-read `DESIGN_SPEC.md`. Before modifying deployment logic, refer to `docker-compose.yml`, `netlify.toml`, and `README.md`.
