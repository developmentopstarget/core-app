# GEMINI.md — Gemini Agent Instructions

This file provides guidance for Google Gemini agents working in this repository.

---

## Default Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend  | FastAPI + Python                    |
| Database | PostgreSQL (future — not yet wired) |
| API      | REST JSON                           |

---

## Do Not Use (Unless Explicitly Requested)

- **Django** — not the backend framework for this project. Use FastAPI only.
- **Next.js** — not the frontend framework for this project. Use Vite + React only.
- **Flask** — FastAPI is the chosen framework.
- **Create React App** — Vite is the build tool.

---

## Implementation Defaults

- Frontend and backend are **separate applications** in separate directories.
- All frontend API calls go through `frontend/src/lib/api.ts`.
- API base URL is set via the `VITE_API_URL` environment variable.
- Backend uses **Pydantic BaseSettings** for configuration from environment variables.
- CORS is configured in `backend/app/main.py`.
- Mobile-first layout is the default for all UI work.
- REST JSON is the default API style — no GraphQL unless asked.

---

## Project Structure

```
fast-webapp-starter/
  frontend/          ← Vite + React + TypeScript + Tailwind
  backend/           ← FastAPI + Python
  AGENTS.md          ← Instructions for all AI agents
  CLAUDE.md          ← Instructions for Claude Code
  GEMINI.md          ← Instructions for Gemini agents (this file)
  README.md          ← Human-readable setup guide
```

---

## Safe Git Rules

- **Do not run `git add .`** — stage files explicitly by name.
- **Do not commit without user approval** — show changes first.
- **Do not commit `.env` files** — only `.env.example` is tracked.
- **Do not force push** to `main` or `master`.
- **Do not commit build artifacts** (`dist/`, `__pycache__/`, `node_modules/`).

---

## Adding PostgreSQL (Future)

The backend is structured to accept PostgreSQL cleanly. When asked:
1. Add `asyncpg`, `sqlalchemy[asyncio]`, `alembic` to `pyproject.toml`.
2. Create `backend/app/db/` with session, base model, and migration config.
3. Add `DATABASE_URL` to `.env.example`.
4. Do not write ORM models until the schema is approved.
