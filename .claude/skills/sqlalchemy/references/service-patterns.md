# Service-layer patterns

## Where queries live

Per this repo's `CLAUDE.md`, route handlers stay thin — SQLAlchemy queries belong in
`app/services/<feature>.py`, taking `db: AsyncSession` as an explicit parameter (never a
module-level session, never re-deriving a session inside a service function):
```python
# app/services/widgets.py
async def get_widget_by_id(db: AsyncSession, widget_id: int) -> Widget | None:
    return await db.get(Widget, widget_id)

async def list_widgets_for_owner(db: AsyncSession, owner_id: int) -> list[Widget]:
    result = await db.execute(select(Widget).where(Widget.owner_id == owner_id))
    return list(result.scalars().all())
```
This mirrors `app/services/auth.py`'s existing `get_user_by_email`/`get_user_by_id`
pattern — small, focused, single-purpose async functions, not a generic repository class
wrapping every model. Don't introduce a `BaseRepository[T]` abstraction unless/until
enough services share enough identical logic to justify it — three near-identical
`get_x_by_id` functions is not that threshold, per this repo's anti-abstraction stance.

## Pagination

2.0-style `select()` composes `.limit()`/`.offset()` directly:
```python
async def list_projects_page(db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 20):
    result = await db.execute(
        select(Project).where(Project.owner_id == owner_id)
        .order_by(Project.created_at.desc())
        .offset(skip).limit(limit)
    )
    return list(result.scalars().all())
```
`OFFSET`-based pagination re-scans skipped rows on every page (gets slower for deep
pages) — fine for typical admin/dashboard list views at this repo's scale. If a listing
ever needs to scale past tens of thousands of rows with deep pagination, switch to
keyset/cursor pagination (`WHERE created_at < :last_seen ORDER BY created_at DESC LIMIT
:n`) instead of reaching for `OFFSET` tuning.

For a total count alongside a page, run a separate `select(func.count()).select_from(...)`
query rather than fetching all rows to `len()` them — don't load full rows just to count.

## Filtering

Build the `WHERE` clause incrementally by reassigning the statement — this is the
idiomatic 2.0 pattern for optional/dynamic filters, cleaner than string-building SQL:
```python
async def search_projects(db: AsyncSession, owner_id: int, status: str | None = None, q: str | None = None):
    stmt = select(Project).where(Project.owner_id == owner_id)
    if status is not None:
        stmt = stmt.where(Project.status == status)
    if q:
        stmt = stmt.where(Project.title.ilike(f"%{q}%"))
    result = await db.execute(stmt)
    return list(result.scalars().all())
```
`ilike` is PostgreSQL-specific case-insensitive LIKE; SQLite's `ilike` is emulated by
SQLAlchemy (works for ASCII, not full Unicode case-folding) — fine for dev, verify actual
case-insensitivity needs against Postgres before relying on it for anything
correctness-sensitive (e.g. uniqueness checks should use a proper `citext` column or a
normalized lowercase column instead of relying on query-time `ilike`).

## Transaction boundaries

The service function should generally **not** call `commit()` if it's one step in a
larger unit of work the caller controls — but for this repo's per-request-session,
single-operation-per-route pattern, each service function that performs a complete write
(e.g. `create_widget`) owns its own `commit()`, matching `services/auth.py`'s style. If
you're writing a service function that's meant to be composed with others in one
transaction (e.g. "create project and its first milestone atomically"), don't have each
sub-function `commit()` independently — restructure so only the outermost call commits,
or use `async with db.begin_nested():` (SAVEPOINT) if partial rollback within a larger
transaction is needed.

## Error handling boundary

Services should raise domain-level exceptions or return `None`/`Optional`, not
`HTTPException` — keep `fastapi` out of `app/services/`. Let the route handler (or a
registered exception handler) translate `None` → 404 / a domain exception → the
appropriate status code. This repo's `services/auth.py` already does this correctly
(`authenticate_user` returns `None` on failure; the route raises `HTTPException`).

## Avoiding N+1 in service functions

When a service function returns objects whose relationships the caller (route handler +
`response_model`) will serialize, eager-load those relationships in the service's own
query — the route handler shouldn't need to know which relationships are needed
downstream. `app/api/projects.py`'s `list_my_projects` demonstrates this:
`select(Project)...options(selectinload(Project.milestones))` — because `ProjectResponse`
includes `milestones`, the query that fetches projects must eager-load them, or
serialization triggers the `MissingGreenlet` lazy-load error at the response-building
step, outside of any request-scoped await context.

## Test database setup

`backend/tests/conftest.py` uses a separate in-memory SQLite engine
(`sqlite+aiosqlite:///:memory:`) with `Base.metadata.create_all`/`drop_all` per test (via
the autouse `reset_db` fixture) — this only works because every model is registered on
the same `Base` used by both the app and the tests. When adding a new model, no test
config changes are needed as long as it subclasses the shared `Base` — it's picked up
automatically by `Base.metadata`. Don't create a second `Base`/`DeclarativeBase` for new
models; there is exactly one metadata registry in this app.
