# AGENTS.md — AI Agent Instructions

This file provides guidance for AI agents (Claude, Gemini, GPT, Codex, etc.) working in this repository.

---

## Default Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend  | FastAPI + Python                    |
| Database | SQLite (development), PostgreSQL (production) |
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
- **SQLAlchemy/Alembic are already part of the backend persistence layer.** Do not replace them unless explicitly asked.
- **Redux** — do not add global state managers unless asked. Use React context or Zustand if needed.

---

## Backend Structure

```
backend/
  app/
    main.py          ← FastAPI app entry point, CORS config, router registration
    api/             ← Route handlers grouped by feature
    core/            ← Config, settings (Pydantic BaseSettings)
    models/          ← SQLAlchemy models
    schemas/         ← Pydantic request/response models
    services/        ← Business logic, separated from route handlers
  alembic/           ← Database migrations
  alembic.ini
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

## Database and Migrations

- Development uses SQLite by default.
- Production uses PostgreSQL through Docker Compose/deployment configuration.
- Async SQLAlchemy is the persistence layer.
- Alembic is used for database migrations.
- Do not change database engines, ORM structure, or migration strategy unless explicitly asked.

---

## Project Handoff Rule

Every project must keep a root-level `handoff.md` file.

Before ending a coding session, running `/clear`, switching AI tools, stopping work for the day, opening a PR, merging a PR, debugging a major issue, or changing deployment/config behavior, update `handoff.md`.

The handoff must capture the current project state only. Do not include old unrelated conversation history.

Required sections:

# Goal

What we are trying to build, fix, or ship.

## Current State

Include:
- current branch
- working tree status
- what works
- what is still broken
- latest test/build status if known

## Files in Flight

Files actively edited or likely relevant next.

## Changed This Session

What was touched, created, deleted, refactored, configured, or tested.

## Failed Attempts

What was tried but did not work, including the reason if known.

## Important Context

Decisions, assumptions, constraints, warnings, credentials/account context, deployment notes, or “do not change” items.

## Next Step

The single next action to take first in a fresh session.

## Commands to Run First

Exact commands the next AI/dev session should run before editing.
