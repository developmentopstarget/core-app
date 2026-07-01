# Settings & config (`pydantic-settings`)

`pydantic-settings` is a separate package from `pydantic` — `BaseSettings` was moved out
of core Pydantic in v2. Import from `pydantic_settings`, not `pydantic`.

## This repo's setup

```python
# app/core/config.py
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_env: str = "development"
    secret_key: str = "change-me-in-production"
    database_url: str = "sqlite+aiosqlite:///./app.db"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.app_env == "production":
            if self.secret_key == "change-me-in-production" or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
        return self

settings = Settings()   # instantiated once, at import time
```
`settings = Settings()` at module scope means **misconfiguration fails at import/startup
time**, not on the first request — this is deliberate and correct: a prod deploy with a
missing/weak `SECRET_KEY` should crash immediately, not silently serve requests insecurely
until someone notices. Don't move settings instantiation inside a function or lazily
defer it "to avoid import-time errors" — that defeats the fail-fast purpose.

Per `CLAUDE.md`: never commit `.env` (gitignored), only `.env.example` is tracked. Every
new field added to `Settings` needs a corresponding placeholder entry in `.env.example`.

## Field value source priority (highest to lowest)

1. CLI arguments (if `cli_parse_args` enabled — not used in this repo)
2. Keyword arguments passed to `Settings(...)` directly
3. Environment variables
4. Variables from the `.env` file (`env_file=".env"`)
5. Secrets directory files (if `secrets_dir` configured — not used in this repo)
6. Field defaults declared on the class

So an actual environment variable always wins over `.env` — this is why `.env` is safe
for local dev defaults: setting a real env var in CI/production (e.g. via Docker
`--env` or a platform's env var UI) overrides it without editing any file.

## Environment variable name mapping

By default, the env var name is the field name as-is. `case_sensitive=False` (set in this
repo) means `DATABASE_URL`, `database_url`, and `Database_Url` are all treated as the same
setting — the practical default for how most deployment platforms expose env vars (often
uppercase by convention, e.g. `DATABASE_URL`), matched against this repo's lowercase
Python field names (`database_url`).

`env_prefix` (not currently used here) namespaces every field under a shared prefix, e.g.
`SettingsConfigDict(env_prefix="APP_")` makes `secret_key` read from `APP_SECRET_KEY`.
Reach for this if this app ever shares an environment with other services and field names
risk colliding.

## Parsing complex types from env vars

Env vars are always strings; `pydantic-settings` parses them into the field's declared
type the same way any Pydantic field does — `allowed_origins: list[str]` (as in this
repo's `Settings`) expects the env var to be **JSON-encoded**, e.g.:
```bash
ALLOWED_ORIGINS='["http://localhost:5173","https://app.example.com"]'
```
A bare comma-separated string (`http://a,http://b`) does **not** parse into a `list[str]`
by default — this is a common surprise. If comma-separated (not JSON) is the desired
input format for a list-typed setting, add a `field_validator(mode="before")` that splits
on `,` when the input is a plain string.

## Nested settings

A `BaseSettings` field can itself be a nested `BaseModel`; by default nested fields are
addressed via `env_nested_delimiter` (e.g. `__`, so `SUB__FIELD` sets `settings.sub.field`)
if configured, or via a single JSON-encoded env var for the whole nested object otherwise.
This repo's `Settings` is currently flat (no nested sub-models) — if config grows complex
enough to warrant grouping (e.g. a `DatabaseSettings` sub-model with pool tuning), set
`model_config = SettingsConfigDict(env_nested_delimiter="__")` at that point rather than
preemptively.

## Secrets (Docker/K8s secrets, cloud secret managers)

`secrets_dir="/run/secrets"` reads each setting from a file named after the field in that
directory (Docker Swarm/Kubernetes secret-mount convention) — lower priority than env
vars and `.env`, so it acts as a fallback/base layer. Built-in support also exists for AWS
Secrets Manager, Azure Key Vault, and Google Cloud Secret Manager as settings sources.
None of this is wired up in this repo (env vars + `.env` cover current needs) — introduce
a secrets source only when actually deploying to an environment that provides one.

## Testing settings

`backend/tests/test_config.py` (already in this repo) is the place to add new test cases
when adding fields/validators to `Settings` — construct `Settings(**overrides)` directly
in tests rather than mutating `os.environ`, since `Settings()` (module-level `settings`)
is already loaded once at import time and later `os.environ` changes won't retroactively
affect it.

Pass `_env_file=None` when constructing `Settings(...)` directly in a test (as this
repo's tests do):
```python
Settings(_env_file=None, app_env="production", secret_key="a" * 32, database_url="postgresql+asyncpg://...")
```
Without it, the real local `.env` file still gets read and merged in underneath your
explicit kwargs (kwargs win per the priority order above, but any field you *didn't*
override in the test would silently pick up whatever happens to be in the developer's
local `.env` — making the test's behavior depend on machine-local state). `_env_file=None`
makes the test hermetic: only the explicit kwargs and class defaults apply.
