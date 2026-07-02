# CLAUDE.md — Claude Code Instructions

This file configures Claude's behavior when working in this repository.

---

## Project Overview

This is a production-style starter template using:

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI + Python
- **Database:** SQLite (development), PostgreSQL (production)
- **API style:** REST JSON

---

## Hard Rules

- **Do not use Django.** FastAPI is the only backend framework in this repo.
- **Do not use Next.js.** Vite + React is the only frontend setup in this repo.
- **Keep frontend and backend separate.** Never merge them into a single framework.
- **Do not commit `.env` files.** Only `.env.example` is tracked.
- **Do not run `git add .`** — stage files by name only.
- **Do not commit without showing the diff and receiving user approval.**
- **Do not replace the existing SQLite/PostgreSQL + async SQLAlchemy/Alembic persistence setup** unless explicitly asked.

---

## Implementation Defaults

- Mobile-first CSS — start with small screen styles, layer up with `md:` and `lg:` breakpoints.
- All API calls go through `frontend/src/lib/api.ts`.
- Backend route handlers are thin — business logic lives in `services/`.
- Pydantic models go in `schemas/`, config goes in `core/config.py`.
- New backend features get their own file in `app/api/`.
- New frontend pages get their own file in `src/pages/`.

---

## Code Style

- TypeScript strict mode is on.
- No `any` types unless unavoidable and explicitly noted.
- Python uses type hints everywhere.
- No bare `except:` blocks in Python.
- Keep functions small and focused.

---

## Git Safety

- Stage specific files, never `git add .`
- Show files before committing.
- Never force push to `main` or `master`.
- Never skip pre-commit hooks.
- Create new commits rather than amending published ones.

---

## Database and Migrations

- Development uses SQLite by default.
- Production uses PostgreSQL.
- Async SQLAlchemy is the persistence layer.
- Alembic is used for migrations.
- Follow `AGENTS.md` for database and migration conventions.

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
