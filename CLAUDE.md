# CLAUDE.md — Claude Code Instructions

This file configures Claude's behavior when working in this repository.

---

## Project Overview

This is a production-style starter template using:

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI + Python
- **Database:** PostgreSQL (future — not yet added)
- **API style:** REST JSON

---

## Hard Rules

- **Do not use Django.** FastAPI is the only backend framework in this repo.
- **Do not use Next.js.** Vite + React is the only frontend setup in this repo.
- **Keep frontend and backend separate.** Never merge them into a single framework.
- **Do not commit `.env` files.** Only `.env.example` is tracked.
- **Do not run `git add .`** — stage files by name only.
- **Do not commit without showing the diff and receiving user approval.**
- **Do not add PostgreSQL** until explicitly asked.

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

## Future PostgreSQL

When asked, follow the plan in `AGENTS.md` under "Adding PostgreSQL (Future)".
