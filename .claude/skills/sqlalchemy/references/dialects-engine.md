# Engine, pooling & dialects

## Engine URLs

Format: `dialect+driver://user:password@host/dbname`. This repo's `database_url` setting:
- Dev: `sqlite+aiosqlite:///./app.db` — the `+aiosqlite` driver suffix is what makes it
  async-compatible; plain `sqlite://` uses the sync driver and won't work with
  `create_async_engine`.
- Prod (required by `Settings.validate_production_settings`): must be a PostgreSQL URL —
  use `postgresql+asyncpg://user:pass@host/db` for async (the `asyncpg` driver), not
  `postgresql://` (defaults to sync `psycopg2`) or `postgresql+psycopg2://`.

Always construct the engine once at module scope (`app/core/database.py`'s `engine =
create_async_engine(...)`) and reuse it — never call `create_async_engine()` per-request,
which defeats connection pooling entirely.

## Connection pooling

`create_async_engine()` defaults to `AsyncAdaptedQueuePool` (the async-compatible
equivalent of the sync `QueuePool`) with reasonable defaults — you don't need to
configure pooling to "turn it on." Tune it only if you have a concrete reason:
```python
create_async_engine(url, pool_size=20, max_overflow=10, pool_recycle=1800, pool_timeout=30)
```
- `pool_size` — steady-state pooled connections. `max_overflow` — extra connections
  allowed under burst load beyond `pool_size`, closed when returned.
- `pool_recycle` (seconds) — recycle connections older than this. Set it below your
  database's/proxy's idle-connection timeout (e.g. PgBouncer, cloud-managed Postgres often
  kill idle connections after a few minutes) to avoid "server closed the connection
  unexpectedly" errors on connections that sat idle too long.
- `pool_pre_ping=True` — issue a lightweight `SELECT 1` before handing out a pooled
  connection, to catch and transparently replace dead connections. Worth enabling in
  production if the DB host can restart/failover independently of the app (most managed
  Postgres setups) — the cost is one extra round-trip per checkout.

`NullPool` (no pooling, new connection per use) is what this repo's `alembic/env.py`
correctly uses for migrations (`async_engine_from_config(..., poolclass=pool.NullPool)`)
— a migration run is a single short-lived process, so pooling only adds overhead there.
Don't use `NullPool` for the app's main request-serving engine.

## SQLite vs PostgreSQL differences that matter here

- **Type strictness**: SQLite is dynamically typed at the storage level and mostly
  ignores column type constraints; PostgreSQL enforces them strictly. A value that
  "works" in dev SQLite (e.g. a string in an integer column) can fail in prod Postgres.
  Don't treat a passing local test as proof a type-sensitive change is safe — the
  `Settings` production validator forcing Postgres in prod exists partly for this reason.
- **Concurrent writes**: SQLite serializes writes at the file level (single-writer);
  PostgreSQL handles real concurrent writes with row-level locking/MVCC. Load-testing
  concurrency locally against SQLite will not surface issues that only appear under real
  concurrent load — this repo's `connect_args={"check_same_thread": False}` for SQLite
  works around the threading restriction but doesn't change the single-writer behavior.
- **`ON CONFLICT` / upserts**: PostgreSQL's dialect provides
  `sqlalchemy.dialects.postgresql.insert(...).on_conflict_do_update(...)` for native
  upserts — SQLite has an equivalent (`sqlalchemy.dialects.sqlite.insert(...)`) with
  similar but not identical syntax. If you write an upsert, import the dialect-specific
  `insert()` matching the target dialect, not the generic `sqlalchemy.insert()` (which
  has no `on_conflict_do_update` method) — and be aware the two dialects' upsert code
  isn't portable without an if/else on the engine dialect.
- **Autoincrement/sequences**: SQLite's `INTEGER PRIMARY KEY` auto-increments implicitly;
  PostgreSQL uses actual sequences. This is transparent for normal `mapped_column(primary_key=True)`
  usage, but don't hand-write raw DDL/SQL assuming SQLite's rowid semantics if it also
  needs to run against Postgres.

## Reflection & inspection

`sqlalchemy.inspect(engine)` (sync) or `AsyncEngine.run_sync(lambda sync_conn:
inspect(sync_conn).get_table_names())` (async) introspects an existing database's schema
— useful for one-off debugging (e.g. "what does the actual prod schema look like right
now") but not something to build application logic around; Alembic migrations, not
runtime reflection, are this repo's source of truth for schema.
