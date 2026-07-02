# core-app

A production-oriented client portal with separate React and FastAPI applications.

## Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend  | FastAPI + Python 3.11+              |
| Database | SQLite (development), PostgreSQL (production) |
| API      | REST JSON                           |

Mobile-first layout by default. Frontend and backend are fully separate applications.

## Features

- Public landing page and open client registration
- JWT authentication with client and admin roles
- Client-specific projects, progress, milestones, previews, and notes
- Admin user listing and project/milestone management
- Async SQLAlchemy persistence and Alembic migrations
- Automated backend tests and GitHub Actions CI
- Docker Compose deployment with PostgreSQL

---

## Project Structure

```
core-app/
  AGENTS.md              ← AI agent instructions
  CLAUDE.md              ← Claude Code instructions
  GEMINI.md              ← Gemini agent instructions
  handoff.md             ← Current project state and next-step handoff
  README.md              ← This file
  .gitignore

  frontend/
    src/
      components/        ← Reusable UI components
      pages/             ← Top-level page components
      lib/               ← API client, utilities
      hooks/             ← Custom React hooks
      types/             ← Shared TypeScript types
    index.html
    package.json
    vite.config.ts
    tsconfig.json
    tailwind.config.js
    postcss.config.js
    .env.example

  backend/
    app/
      main.py            ← FastAPI entry point, CORS, router setup
      api/
        health.py        ← GET /health route
      core/
        config.py        ← Pydantic settings
      models/            ← SQLAlchemy models
      schemas/           ← Pydantic request/response models
      services/          ← Business logic
    pyproject.toml
    alembic/             ← Database migrations
    alembic.ini
    .env.example
```

---

## Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- `uv` (recommended) or `pip`

---

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

### Backend

Using `uv` (recommended):

```bash
cd backend
uv venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Using `pip`:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Backend runs at: `http://localhost:8000`

API docs: `http://localhost:8000/docs`

Health check: `http://localhost:8000/health`

Readiness check: `http://localhost:8000/ready`

Apply migrations before starting a deployed backend:

```bash
alembic upgrade head
```

If a local SQLite database was created by an older version of the application, back it up and
baseline it once before applying future migrations:

```bash
alembic stamp 20260701_0001
```

---

## Dev Commands

### Frontend

| Command           | Action                        |
|-------------------|-------------------------------|
| `npm run dev`     | Start Vite dev server         |
| `npm run build`   | Production build              |
| `npm run preview` | Preview production build      |
| `npm run lint`    | Run ESLint                    |
| `npm test`        | Run frontend tests            |

### Backend

| Command                                     | Action                    |
|---------------------------------------------|---------------------------|
| `uvicorn app.main:app --reload`             | Start dev server          |
| `pytest`                                    | Run tests                 |
| `ruff check .`                              | Lint                      |
| `ruff format .`                             | Format                    |
| `alembic upgrade head`                      | Apply migrations          |

---

## Environment Variables

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)

```
ALLOWED_ORIGINS=["http://localhost:5173"]
APP_ENV=development
SECRET_KEY=change-me-in-production
DATABASE_URL=sqlite+aiosqlite:///./app.db
```

---

## Production with Docker

Set production secrets and start the PostgreSQL-backed stack:

```bash
export SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
export POSTGRES_PASSWORD="replace-with-a-strong-password"
docker compose up --build
```

The frontend is served at `http://localhost:8080`. Production startup rejects placeholder secrets
and SQLite URLs. Change the CORS origins and frontend API URL for the deployment domain.

---

## Conventions

- **No Django.** FastAPI is the backend framework.
- **No Next.js.** Vite + React is the frontend setup.
- **Mobile-first** layout — `sm:` and up for larger screens.
- **REST JSON** — no GraphQL or tRPC unless added explicitly.
- **Thin route handlers** — business logic lives in `services/`, not in `api/`.

---

## AI Handoff

This project uses `handoff.md` as the active project state checkpoint for AI coding sessions.

Before ending a coding session, switching AI tools, running `/clear`, opening or merging a PR, debugging a major issue, or changing deployment/config behavior, update `handoff.md`.

Fresh AI sessions should read the relevant instruction file plus `handoff.md`, then run:

```bash
git status
```
