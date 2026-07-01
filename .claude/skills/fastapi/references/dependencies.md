# Dependency injection

`Depends()` is FastAPI's DI mechanism. A dependency is any callable (function, or class
via `__init__`) whose return value gets injected into the parameter that declares it.

## Function dependencies

```python
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/")
async def list_items(db: AsyncSession = Depends(get_db)):
    ...
```

## Classes as dependencies

A class works as a dependency because FastAPI calls it like a function — its `__init__`
signature is analyzed the same way a function's is, so its own params can themselves be
`Depends()`-injected:
```python
class Pagination:
    def __init__(self, skip: int = 0, limit: int = 100):
        self.skip = skip
        self.limit = limit

@router.get("/")
async def list_items(pagination: Pagination = Depends()):
    # Depends() with no argument infers Pagination from the type annotation
    ...
```

## Sub-dependencies

Dependencies can depend on other dependencies — FastAPI resolves the graph and, **within
a single request**, calls each unique dependency only once and reuses the cached result
for every place that depends on it (unless you pass `Depends(fn, use_cache=False)`).

```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    ...

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```
If two routes on the same request both depend on `get_current_user` (directly or via
`require_admin`), it still only executes once per request.

## Dependencies with `yield` (setup/teardown)

Anything before `yield` runs before the route handler; anything after runs after the
response is sent (this is how `get_db` closes its session). FastAPI wraps this the same
way Python's `with` statement wraps a context manager.

**Critical gotcha**: if you `except` an exception in a yield-dependency's teardown and
don't re-raise it (or a new exception), FastAPI never learns an error occurred. The
client gets a bare `500 Internal Server Error` with **no log line anywhere** — the
original exception is silently swallowed:
```python
async def get_db():
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise            # REQUIRED — omitting this hides the error completely
    finally:
        await session.close()
```
Always `raise` (bare, or a new exception) inside any `except` block in a yield-dependency.

Yield-dependencies execute their teardown in **reverse order** relative to how they were
acquired (last acquired, first torn down) — same as nested context managers.

## Dependencies in the path decorator (no return value used)

Use `dependencies=[Depends(verify_key)]` on the route decorator (not as a function param)
when a dependency's return value isn't needed — e.g. a permission check that only raises
on failure. Same pattern at the `APIRouter(dependencies=[...])` or `FastAPI(dependencies=[...])`
level applies the check to every route in that router/app.

## Global dependencies

`FastAPI(dependencies=[Depends(log_request)])` runs a dependency on every request across
the whole app — useful for cross-cutting checks that aren't full ASGI middleware (e.g. a
lightweight per-route audit hook), but prefer real middleware (see database-architecture.md)
for anything needing access to the raw response after route execution.

## Advanced: dependencies as callable class instances

A class with `__call__` can act as a parameterized dependency factory — useful for the
same "kind" of check with different config per route (e.g. a rate limiter keyed by a
different limit per endpoint):
```python
class RateLimiter:
    def __init__(self, times: int):
        self.times = times
    async def __call__(self, request: Request):
        ...

@router.get("/", dependencies=[Depends(RateLimiter(times=5))])
```
