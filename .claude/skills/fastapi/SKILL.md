---
name: fastapi
description: |
  Build and extend FastAPI backend features: path operations, Pydantic request/response
  models, dependency injection, OAuth2/JWT auth, testing with TestClient, SQLAlchemy
  database integration, and deployment. Use when adding or modifying FastAPI routes,
  services, schemas, auth, or backend architecture in a Python API project.
---

# FastAPI

FastAPI is an async-first Python web framework built on Starlette + Pydantic. Routes
declare their inputs/outputs as typed Python — FastAPI derives validation, serialization,
and OpenAPI docs from those types automatically.

## This repo's conventions

This project's `CLAUDE.md` fixes the layout — follow it, don't reinvent it:

- Route handlers live in `backend/app/api/<feature>.py`, stay thin, and delegate logic
  to `backend/app/services/<feature>.py`.
- Request/response Pydantic models live in `backend/app/schemas/<feature>.py`.
- SQLAlchemy ORM models live in `backend/app/models/<feature>.py`.
- Config is a single `pydantic-settings` `Settings` instance in `backend/app/core/config.py`,
  imported as `from app.core.config import settings`.
- DB session dependency is `get_db` in `backend/app/core/database.py` (async SQLAlchemy).
- Auth dependencies (`get_current_user`, `require_admin`) live in `backend/app/core/dependencies.py`.
- New routers get registered in `backend/app/main.py` via `app.include_router(...)`.

Look at `backend/app/api/projects.py`, `backend/app/core/dependencies.py`, and
`backend/app/core/database.py` for the canonical pattern before writing new endpoints —
match their style exactly (async `def`, `Depends()`, `AsyncSession`, `select()` queries,
`response_model=`).

## Quick start: a new endpoint

```python
# app/api/widgets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.widget import Widget
from app.schemas.widget import WidgetCreate, WidgetResponse
from app.services.widgets import create_widget

router = APIRouter(prefix="/widgets", tags=["widgets"])


@router.get("/", response_model=list[WidgetResponse])
async def list_widgets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Widget]:
    result = await db.execute(select(Widget).where(Widget.owner_id == current_user.id))
    return list(result.scalars().all())


@router.post("/", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED)
async def post_widget(
    payload: WidgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Widget:
    return await create_widget(db, owner_id=current_user.id, data=payload)
```

Register it in `app/main.py`:
```python
from app.api.widgets import router as widgets_router
app.include_router(widgets_router)
```

## Navigation

- **Building routes, params, request/response bodies, error handling, CORS, background
  tasks, streaming, routers** → [references/core-api.md](references/core-api.md)
- **Dependency injection patterns** (classes as deps, sub-deps, `yield`/cleanup deps,
  caching, global deps) → [references/dependencies.md](references/dependencies.md)
- **Auth**: OAuth2 password flow, JWT issuing/decoding, scopes, `get_current_user`
  patterns matching this repo's `HTTPBearer` setup → [references/security-auth.md](references/security-auth.md)
- **Testing**: `TestClient`, async tests, dependency overrides, test databases, testing
  websockets → [references/testing.md](references/testing.md)
- **Database & architecture**: async SQLAlchemy session lifecycle, `pydantic-settings`
  config, middleware, lifespan startup/shutdown, sub-apps, reverse proxy → [references/database-architecture.md](references/database-architecture.md)
- **Deployment**: Docker, Uvicorn/Gunicorn workers, HTTPS, env vars, `fastapi run`/`fastapi dev` → [references/deployment.md](references/deployment.md)

## Non-obvious gotchas worth knowing up front

- **Route order matters.** Static paths must be declared before dynamic ones on the same
  prefix: `@router.get("/me")` before `@router.get("/{user_id}")`, or `/me` never matches.
- **`response_model` filters output** — fields not on the response schema are dropped even
  if the ORM object has them. This is how you avoid leaking password hashes etc.
- **Pydantic validates request bodies, not path/query params by type alone** — use
  `Annotated[int, Query(gt=0)]`-style constraints for validation beyond basic type coercion.
- **Dependencies with `yield`**: if you `except` an exception and don't re-raise it, FastAPI
  never finds out — the client gets a bare 500 with **no server-side log**. Always
  `raise` (or raise a new exception) inside an `except` block in a yield-dependency.
- **`async def` vs `def` route handlers**: plain `def` handlers run in a threadpool (safe
  for blocking I/O); `async def` handlers run on the event loop (must not block it). Don't
  mix blocking calls into `async def` handlers.
