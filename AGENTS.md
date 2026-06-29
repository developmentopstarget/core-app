# AGENTS.md — AI Agent Instructions

This file provides guidance for AI agents (Claude, Gemini, GPT, Codex, etc.) working in this repository.

---

## Default Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend  | FastAPI + Python                    |
| Database | PostgreSQL (future — not yet wired) |
| API      | REST JSON                           |

---

## Stack Defaults

- **Frontend and backend are separate.** Do not merge them into a monorepo framework like Next.js.
- **Mobile-first layout** is the default for all UI components.
- **API responses** use JSON. No GraphQL or tRPC unless explicitly requested.
- **CORS** is handled in the backend via FastAPI middleware.
- **Environment variables** are loaded from `.env` files. Never commit real secrets. Use `.env.example` as the template.

---

## What NOT to Use (Unless Explicitly Requested)

- **Django** — do not use. FastAPI is the default backend framework.
- **Next.js** — do not use. Vite + React is the default frontend setup.
- **SQLAlchemy (yet)** — backend is structured to add it cleanly, but do not add it unless asked.
- **Redux** — do not add global state managers unless asked. Use React context or Zustand if needed.

---

## Backend Structure

```
backend/
  app/
    main.py          ← FastAPI app entry point, CORS config, router registration
    api/             ← Route handlers grouped by feature
    core/            ← Config, settings (Pydantic BaseSettings)
    schemas/         ← Pydantic request/response models
    services/        ← Business logic, separated from route handlers
  pyproject.toml
  .env.example
```

- Add new routes in `app/api/` as separate modules.
- Add new Pydantic models in `app/schemas/`.
- Keep business logic in `app/services/`, not in route handlers.
- When PostgreSQL is added: create `app/db/` for models, session, and migrations.

---

## Frontend Structure

```
frontend/
  src/
    components/      ← Reusable UI components
    pages/           ← Top-level page components (one per route)
    lib/             ← API client, utilities, constants
    hooks/           ← Custom React hooks
    types/           ← Shared TypeScript types
```

- API base URL comes from `VITE_API_URL` environment variable.
- All API calls go through `src/lib/api.ts`.
- Pages live in `src/pages/`, components live in `src/components/`.

---

## Safe Git Rules

- **Do not run `git add .`** — stage files explicitly by name.
- **Do not commit without user approval** — show a diff or file list first.
- **Do not force push** to `main` or `master`.
- **Do not skip hooks** (`--no-verify`) unless explicitly asked.
- **Do not commit `.env` files** — only `.env.example` is committed.
- **Do not commit `node_modules/`**, `__pycache__/`, or build output directories.
- Prefer creating new commits over amending existing ones.

---

## Adding PostgreSQL (Future)

When asked to add PostgreSQL:
1. Add `asyncpg`, `sqlalchemy[asyncio]`, and `alembic` to `pyproject.toml`.
2. Create `backend/app/db/` with `session.py`, `base.py`, and `models/`.
3. Add `DATABASE_URL` to `.env.example`.
4. Wire up `alembic` for migrations in `backend/`.
5. Do not add any ORM models until the schema is discussed.
