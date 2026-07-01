# Alembic migrations

## This repo's setup

`backend/alembic/env.py` is already configured for the async engine — don't rewrite it
using the sync `Session`/`Engine` boilerplate from generic Alembic tutorials, which
assumes a sync `create_engine()`:
```python
async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.", poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)   # bridges async -> Alembic's sync API
    await connectable.dispose()
```
`target_metadata = Base.metadata` (from `app.core.database`) is what autogenerate diffs
against — this only works because `env.py` does `import app.models  # noqa: F401` first,
which registers every model class on `Base.metadata`. **If you add a new model module
that isn't imported anywhere reachable from `app.models`'s `__init__.py`, autogenerate
silently won't see it** — no error, it just won't appear in the generated migration. Add
new model files under `app/models/` and make sure `app/models/__init__.py` (or an import
chain from it) picks them up.

## Standard workflow

```bash
cd backend
alembic revision --autogenerate -m "add widgets table"
# ALWAYS read the generated file in alembic/versions/ before proceeding
alembic upgrade head        # apply
alembic downgrade -1        # roll back one revision, if needed
alembic history              # see the revision chain
```
This repo's existing migration (`alembic/versions/20260701_0001_initial.py`) is the
reference for style: explicit `sa.Column(...)` calls (not raw SQL), `sa.PrimaryKeyConstraint`,
`sa.ForeignKeyConstraint`, and a paired `create_index`/`drop_index` for every indexed
column in `upgrade()`/`downgrade()` respectively. Match this style — don't hand-write raw
`op.execute("ALTER TABLE ...")` unless autogenerate genuinely can't express the change.

## What autogenerate reliably detects vs. doesn't

**Will detect**: table add/remove, column add/remove, nullable changes, basic index and
named-constraint changes, basic foreign key changes.

**Can detect if enabled** (`env.py`'s `do_run_migrations`/`run_migrations_offline` already
set `compare_type=True`, so this repo has type-change detection on): column type changes,
server default changes (`compare_server_default` — off by default, this repo doesn't set it).

**Cannot detect at all** — these require hand-editing the generated migration:
- **Table/column renames** — autogenerate sees a rename as an unrelated drop+add pair.
  Applying the generated migration as-is **drops the column and its data**. If you rename
  a column, edit the migration to use `op.alter_column(table, old_name, new_column_name=new_name)`
  instead of the generated drop/add.
- **Anonymously-named constraints** — always pass `name=` to `UniqueConstraint`,
  `CheckConstraint`, etc. so Alembic can track and diff them across migrations.
- Free-standing `PRIMARY KEY`/`CHECK`/`EXCLUDE` constraint additions, and new sequences,
  are unreliable/unsupported — verify these manually in the generated file.

**The rule**: autogenerate is a first draft, never trust it blindly. Every generated
migration needs a human read-through against the intended model change before
`alembic upgrade head` runs anywhere real.

## Reviewing a generated migration — checklist

1. Does `upgrade()` match the intended model change (not more, not less)?
2. Is `downgrade()` the true inverse (drops what `upgrade()` created, in reverse order —
   see the existing migration's index-then-table drop ordering)?
3. Any rename that autogenerate rendered as drop+add? Rewrite as `alter_column`/`rename_table`.
4. Any new constraint missing an explicit `name=`?
5. For a column going from nullable to `NOT NULL` on a table with existing rows: does the
   migration need a data backfill step (`op.execute(...)` to populate the column) *before*
   the `NOT NULL` is applied, or does the new column have a `server_default` covering
   existing rows? A bare nullable→non-nullable migration against a populated table fails
   at apply time on Postgres if old rows would violate the new constraint.

## Data migrations

For migrations that need to move/transform data (not just schema), use `op.get_bind()`
to get a connection and run plain SQL or a bound Core `select`/`update` inside
`upgrade()` — don't import and use the ORM models directly in a migration (models change
over time; a migration must remain runnable against the schema as it existed at that
revision, which a future model refactor could break). Prefer `sa.table()`/`sa.column()`
lightweight constructs scoped to the migration file itself over importing `app.models`.
