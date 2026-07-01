# Async sessions & queries

## Session lifecycle (this repo's setup)

```python
# app/core/database.py
engine = create_async_engine(settings.database_url, echo=settings.app_env == "development")
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```
One session per request (via `Depends(get_db)`), closed automatically when the `async
with` block exits at the end of the yield-dependency. Never share a session across
requests or hold one open across an `await` that isn't a DB call — `AsyncSession` is not
safe for concurrent use from multiple coroutines simultaneously.

`expire_on_commit=False` is required here: the default (`True`) expires every attribute
after `commit()`, and the next attribute access would trigger an implicit refresh —
which, under asyncio, cannot happen synchronously and instead raises
`MissingGreenlet`/`IllegalStateChangeError`. With it `False`, already-loaded attributes
stay readable after commit (this is how a route can `commit()` then immediately return
the object through a `response_model`).

## 2.0-style queries

Always `select(Model)` + `session.execute()`, never the legacy `session.query(Model)`:
```python
from sqlalchemy import select

result = await db.execute(select(Project).where(Project.owner_id == user_id))
projects = list(result.scalars().all())          # many rows, unwrap to model instances
one = result.scalar_one_or_none()                 # zero-or-one row (None if no match)
one = result.scalar_one()                          # exactly one row, raises otherwise
```
`db.scalars(stmt)` and `db.scalar(stmt)` are shortcuts that skip the `.scalars()` call
on the result — prefer them for simple single-entity queries:
```python
result = await db.scalars(select(Project).where(Project.owner_id == user_id))
projects = list(result.all())
```
`db.get(Model, pk)` is the fastest way to fetch by primary key — it checks the session's
identity map before issuing SQL:
```python
project = await db.get(Project, project_id)
```

## Eager loading (avoiding N+1 and `MissingGreenlet`)

Under `AsyncSession`, accessing an **unloaded** `relationship()` attribute doesn't
silently issue a lazy-load query the way sync SQLAlchemy does — it raises, because lazy
loading needs a synchronous DB round-trip that the async driver can't perform outside an
awaited call. You must load relationships you intend to access, in the query itself:

```python
from sqlalchemy.orm import selectinload, joinedload

# selectinload: separate SELECT per relationship, batched by parent IDs — best default
# for one-to-many/many-to-many (avoids row multiplication)
result = await db.execute(
    select(Project).where(Project.owner_id == user_id).options(selectinload(Project.milestones))
)

# joinedload: single query via LEFT OUTER JOIN — best for many-to-one/one-to-one
# (no row multiplication risk since the "many" side isn't being joined)
result = await db.execute(select(Milestone).options(joinedload(Milestone.project)))
```
Nest with `.options(selectinload(Project.milestones).selectinload(Milestone.comments))`
for multi-level eager loading. Getting this wrong is the single most common async
SQLAlchemy bug: a route works in a quick manual test (where the relationship happens to
already be loaded from a prior query in the same session) and then breaks in production
with `MissingGreenlet` the first time it's hit fresh — always eager-load explicitly
rather than relying on incidental prior loads.

If you truly need on-demand lazy loading in async code, use the `AsyncAttrs` mixin's
`.awaitable_attrs`:
```python
class Base(AsyncAttrs, DeclarativeBase):  # add AsyncAttrs to this repo's Base if adopted
    pass

for milestone in await project.awaitable_attrs.milestones:
    ...
```
This repo's `Base` doesn't currently include `AsyncAttrs` — prefer explicit
`selectinload`/`joinedload` in the query over adding this mixin, since eager loading at
the query site is more predictable and easier to reason about than deferred awaitable
access scattered through service code.

## Writes & transactions

```python
db.add(new_project)
await db.commit()
await db.refresh(new_project)   # repopulate server-generated fields (id, defaults, etc.)
```
`db.add()` stages the object; nothing hits the DB until `flush()` (implicit before
queries that need it, or explicit `await db.flush()`) or `commit()`. Use `flush()` alone
(no commit) when you need a generated PK (e.g. to use `new_project.id` for a related
insert) but the overall unit of work isn't done yet — this keeps everything in one
transaction, rolled back together on error.

For multi-step writes that must succeed or fail atomically, do them on one session before
a single `commit()` — don't call `commit()` after each step, or a later failure leaves
earlier steps permanently applied.

`async with db.begin():` opens an explicit transaction block that commits on successful
exit and rolls back on exception — useful when a service function needs to guarantee
atomicity independent of whatever the caller does with the session afterward, though for
this repo's per-request-session pattern, a single `commit()` at the end of the request
achieves the same effect more simply.

## Partial updates

```python
async def update_project(db: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project
```
`exclude_unset=True` on the Pydantic schema ensures fields the client didn't send aren't
overwritten with their schema defaults.
