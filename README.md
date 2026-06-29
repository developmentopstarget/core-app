# fast-webapp-starter

A production-style starter template for building web apps with a clean separation between frontend and backend.

## Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend  | FastAPI + Python 3.11+              |
| Database | PostgreSQL (future — see below)     |
| API      | REST JSON                           |

Mobile-first layout by default. Frontend and backend are fully separate applications.

---

## Project Structure

```
fast-webapp-starter/
  AGENTS.md              ← AI agent instructions
  CLAUDE.md              ← Claude Code instructions
  GEMINI.md              ← Gemini agent instructions
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
      schemas/           ← Pydantic request/response models
      services/          ← Business logic
    pyproject.toml
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
uvicorn app.main:app --reload
```

Using `pip`:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

Backend runs at: `http://localhost:8000`

API docs: `http://localhost:8000/docs`

Health check: `http://localhost:8000/health`

---

## Dev Commands

### Frontend

| Command           | Action                        |
|-------------------|-------------------------------|
| `npm run dev`     | Start Vite dev server         |
| `npm run build`   | Production build              |
| `npm run preview` | Preview production build      |
| `npm run lint`    | Run ESLint                    |

### Backend

| Command                                     | Action                    |
|---------------------------------------------|---------------------------|
| `uvicorn app.main:app --reload`             | Start dev server          |
| `pytest`                                    | Run tests                 |
| `ruff check .`                              | Lint                      |
| `ruff format .`                             | Format                    |

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
```

---

## Adding PostgreSQL (Future)

The backend is structured to accept PostgreSQL without refactoring existing code:

1. Add `asyncpg`, `sqlalchemy[asyncio]`, and `alembic` to `pyproject.toml`.
2. Create `backend/app/db/` with `session.py`, `base.py`, and `models/`.
3. Add `DATABASE_URL` to `backend/.env.example`.
4. Initialize Alembic: `alembic init alembic` inside `backend/`.
5. Wire the DB session into route dependencies.

No ORM code or migration files are included in this starter — add them when the schema is defined.

---

## Conventions

- **No Django.** FastAPI is the backend framework.
- **No Next.js.** Vite + React is the frontend setup.
- **Mobile-first** layout — `sm:` and up for larger screens.
- **REST JSON** — no GraphQL or tRPC unless added explicitly.
- **Thin route handlers** — business logic lives in `services/`, not in `api/`.
