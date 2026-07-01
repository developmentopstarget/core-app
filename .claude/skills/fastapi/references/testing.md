# Testing

## This repo's setup (already wired up — extend, don't replace)

`backend/tests/conftest.py` already provides:
- `client` fixture — an `httpx.AsyncClient` wrapping the app via `ASGITransport` (no real
  server/socket needed).
- `app.dependency_overrides[get_db] = _override_get_db` — every test hits an in-memory
  SQLite engine instead of the real `database_url`.
- `reset_db` (autouse) — creates all tables before each test, drops them after. Tests
  don't leak state into each other.

New test files follow the existing pattern in `test_projects.py`/`test_auth.py`:
```python
import pytest

async def test_list_widgets(client, test_session):
    # No @pytest.mark.asyncio needed — asyncio_mode = "auto" is set in pyproject.toml
    resp = await client.get("/widgets/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == []
```
Use the `client` fixture for HTTP-level tests (route + validation + serialization). Use
`test_session` directly when a test needs to seed rows via the ORM before hitting an
endpoint, or assert on DB state after.

## Why `dependency_overrides`, not mocking

`app.dependency_overrides` is a dict on the `FastAPI` instance: `{original_dependency:
replacement_callable}`. FastAPI checks this dict before resolving any `Depends()` — so
overriding `get_db` once in `conftest.py` redirects *every* route that depends on it
(directly or transitively through `get_current_user`, etc.) without touching route code
or mocking anything. Always **clear overrides you add in a single test** (or scope them
to a fixture) so they don't bleed into other tests:
```python
def test_something(client):
    app.dependency_overrides[get_current_user] = lambda: fake_admin_user
    try:
        ...
    finally:
        del app.dependency_overrides[get_current_user]
```

## Async tests

Route handlers here are `async def`, so tests calling them through `AsyncClient` must
also be `async def`. `backend/pyproject.toml` sets `asyncio_mode = "auto"`, so plain
`async def test_...` functions run correctly without a `@pytest.mark.asyncio` marker.

Never use `TestClient` (sync, `httpx`-based but blocking) mixed with async fixtures in the
same test — pick one client style per test module. This repo standardized on the async
`AsyncClient` pattern in `conftest.py`; match it rather than introducing sync `TestClient`.

## Testing auth-protected routes

Two options, both valid depending on what the test is actually verifying:
1. **Real token**: call the actual login endpoint (or `create_access_token` directly) to
   get a real JWT, then pass `Authorization: Bearer <token>` — exercises the real auth
   path, best for auth-flow tests themselves.
2. **Override the dependency**: `app.dependency_overrides[get_current_user] = lambda:
   some_user` — skips auth entirely, best for tests where auth is incidental and you just
   need "some authenticated user" to test business logic.

## Testing error responses

Assert both status code and `detail`:
```python
resp = await client.get(f"/projects/{other_users_project_id}", headers=auth_headers)
assert resp.status_code == 404
assert resp.json()["detail"] == "Project not found"
```
Note this repo deliberately returns 404 (not 403) for another user's project — testing
for the *specific* status code (not just "is an error") catches accidental regressions
that would leak resource existence.

## Testing websockets (if added)

`client.websocket_connect("/ws")` (via `starlette.testclient.TestClient`, since
`httpx.AsyncClient` has no websocket support) as a context manager, then `.send_json()`/
`.receive_json()`. Websocket tests are one of the few cases where the sync `TestClient`
is still needed even in an otherwise-async test suite.
