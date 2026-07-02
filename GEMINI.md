# GEMINI.md — Gemini Agent Instructions

This file provides guidance for Google Gemini agents working in this repository.

---

## Default Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend  | FastAPI + Python                    |
| Database | SQLite (development), PostgreSQL (production) |
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
core-app/
  frontend/          ← Vite + React + TypeScript + Tailwind
  backend/           ← FastAPI + Python
  AGENTS.md          ← Instructions for all AI agents
  CLAUDE.md          ← Instructions for Claude Code
  GEMINI.md          ← Instructions for Gemini agents
  handoff.md         ← Current project state and next-step handoff
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

## Database and Migrations

- Development uses SQLite by default.
- Production uses PostgreSQL.
- Async SQLAlchemy is the persistence layer.
- Alembic is used for migrations.
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
