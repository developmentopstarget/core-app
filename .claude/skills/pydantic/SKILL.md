---
name: pydantic
description: |
  Define, validate, and serialize data with Pydantic v2: BaseModel fields and constraints,
  validators, serialization/JSON Schema customization, and pydantic-settings configuration.
  Use when adding or modifying request/response schemas, data models, validation logic,
  or settings/config classes in a Python project using Pydantic v2.
---

# Pydantic v2

Pydantic v2 defines schema as typed Python classes (`BaseModel`) and validates/serializes
against it. It's the type layer under both FastAPI's request/response schemas and
`pydantic-settings`'s config classes in this repo.

## This repo's conventions

- Request/response schemas live in `backend/app/schemas/<feature>.py` — see
  `app/schemas/project.py` and `app/schemas/auth.py` for the canonical style.
- **One model per operation, not one shared model**: `ProjectCreate`, `ProjectUpdate`,
  `ProjectResponse` are three separate classes, not one model with optional everything.
  `*Create` has required fields with sensible defaults; `*Update` has every field
  `| None = None` (for partial-update semantics via `exclude_unset=True` — see the
  `sqlalchemy` skill's service-patterns reference); `*Response` adds `model_config =
  {"from_attributes": True}` so it can validate directly from an ORM instance.
- `Field(min_length=..., max_length=..., ge=..., le=...)` for constraints, not manual
  `if` checks in a validator — see `progress: int = Field(ge=0, le=100)` in
  `ProjectResponse`/`ProjectCreate`.
- `Literal["active", "paused", ...]` for closed string enums in request schemas (e.g.
  `ProjectStatus`), not a plain `str` — this rejects invalid values at the validation
  layer instead of letting them reach the database.
- `EmailStr` (from `pydantic[email]`) for email fields, `HttpUrl` for URL fields — both
  already used in `schemas/auth.py`/`schemas/project.py`. Don't hand-roll regex validation
  for these.
- Config (`app/core/config.py`) is a single `pydantic-settings` `BaseSettings` — see
  `references/settings-config.md`.

## Quick start: a new schema

```python
# app/schemas/widget.py
from pydantic import BaseModel, Field

class WidgetResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    model_config = {"from_attributes": True}

class WidgetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)

class WidgetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
```

## Navigation

- **Model/field basics**: `BaseModel`, `Field()` constraints, `model_config`,
  `computed_field`, this repo's Create/Update/Response DTO pattern →
  [references/models-fields.md](references/models-fields.md)
- **Validators**: `field_validator`/`model_validator`, before/after/wrap modes,
  execution order, cross-field validation → [references/validators.md](references/validators.md)
- **Serialization & JSON Schema**: `model_dump`/`model_dump_json`, `exclude`/`include`,
  aliases (camelCase APIs), customizing the OpenAPI schema FastAPI generates →
  [references/serialization-schema.md](references/serialization-schema.md)
- **Types**: constrained/custom types, `Annotated` pattern, strict mode, forward
  references between schemas → [references/types.md](references/types.md)
- **Settings**: `pydantic-settings` deep dive — env parsing, nested settings, secrets,
  grounded in this repo's `app/core/config.py` → [references/settings-config.md](references/settings-config.md)

## Non-obvious gotchas worth knowing up front

- **`from_attributes=True` is required to validate a Pydantic model from an ORM object**
  (SQLAlchemy model, etc.) instead of a dict — without it, `ProjectResponse.model_validate(project)`
  raises. Every `*Response` schema in this repo needs it; every `*Create`/`*Update` schema
  (which validates from client JSON, not an ORM object) doesn't.
- **`model_validator(mode="before")` receives raw, untyped input** (often a dict, but not
  guaranteed — e.g. if called via `from_attributes`, it could be an arbitrary object).
  Don't assume `.get()` works; check `isinstance(data, dict)` first if you need dict-only
  logic (see `app/core/config.py`'s pattern, which uses `mode="after"` instead — safer
  when you only need to check already-validated field values).
- **Field constraint validators run before, not instead of, custom `field_validator`s.**
  `Field(ge=0)` failing means your `@field_validator` never runs for that field on that
  input — order matters when reasoning about which error message a client will see.
- **Mutating a value in a `before` validator and then raising** can leak the mutated value
  into other validators when the field is part of a `Union` — return early or avoid
  mutating in place if you're about to raise.
