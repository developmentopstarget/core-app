# Types

## Built-in validated types already used in this repo

- `EmailStr` — requires the `email-validator` package; this repo declares it via the
  `pydantic[email]` extra in `pyproject.toml` (`schemas/auth.py` uses it). If a fresh
  environment raises `ImportError: email-validator is not installed` when importing a
  schema with `EmailStr`, the fix is ensuring the `[email]` extra is installed, not
  switching to a plain `str` with a manual regex.
- `HttpUrl` — validates and normalizes a URL (`schemas/project.py`'s `preview_url`).
  Note `HttpUrl` is **not** a plain `str` at the type level — it's a `Url` object.
  `str(HttpUrl(...))` gives the string back, but code that stores/compares it as a raw
  string (e.g. before writing to a `String` DB column) needs the explicit `str(...)` cast;
  passing the `HttpUrl` object directly into a SQLAlchemy string column usually works via
  `__str__` coercion but relying on that implicitly is fragile — cast explicitly.
- Other useful ones not yet used here: `SecretStr`/`SecretBytes` (value hidden in `repr()`
  and excluded from default logging output — good for anything sensitive that must still
  flow through a schema, though this repo currently keeps passwords out of response
  schemas entirely rather than passing them through as `SecretStr`), `UUID4`, `PositiveInt`/
  `NonNegativeInt` (shorthand for `Annotated[int, Field(gt=0)]`/`Field(ge=0)`).

## The `Annotated` pattern for reusable constrained types

Prefer defining a reusable type alias over repeating the same `Field(...)` constraint on
every schema that needs it:
```python
from typing import Annotated
from pydantic import Field

Title = Annotated[str, Field(min_length=1, max_length=200)]

class ProjectCreate(BaseModel):
    title: Title
class MilestoneCreate(BaseModel):
    title: Title
```
This is the same rationale as this repo's `ProjectStatus = Literal["active", "paused",
"completed", "cancelled"]` alias in `schemas/project.py` — extend the same pattern to
other constraints repeated across schemas (e.g. a shared `Title` alias would remove the
duplicated `Field(min_length=1, max_length=200)` currently repeated across
`Milestone*`/`Project*` schemas).

## Custom types

For a genuinely custom type (not expressible as `Annotated[builtin, Field(...)]`),
implement `__get_pydantic_core_schema__` on the type itself, or wrap a plain class with
`Annotated[MyClass, BeforeValidator(...), PlainSerializer(...)]` for one-off cases without
modifying the class. Reach for this only when built-in types + `Field` constraints +
`field_validator` genuinely can't express the rule — it's the most powerful but also most
complex extension point.

## Forward references & self-referencing models

A model referencing a not-yet-defined type (including itself, or another model defined
later in the same module) needs the annotation as a string, or `from __future__ import
annotations` at the top of the file:
```python
class Milestone(BaseModel):
    project: "Project | None" = None   # Project defined later, or in another module
```
If a forward reference can't be resolved automatically (e.g. it depends on a name only
available at a certain point in complex import graphs), call `Model.model_rebuild()`
after all referenced types are defined/imported, before the model is used.

**Cyclic references** (a model that references itself through a chain — e.g. an ORM
back-reference like `Project.milestones` → `Milestone.project` → back to the project)
are safe: Pydantic detects the cycle during validation and raises a `ValidationError`
rather than infinite-recursing. This matters if a schema is ever built with
`from_attributes=True` directly over a bidirectional SQLAlchemy `relationship()` pair —
if both sides are eagerly included in each other's response schema, validating one can
walk into the cycle. This repo avoids the issue by design: `ProjectResponse` includes
`milestones: list[MilestoneResponse]`, but `MilestoneResponse` does **not** include a
back-reference to `project` — keep new response schemas asymmetric the same way rather
than mirroring the ORM's bidirectional `relationship()` structure one-to-one.

## Strict mode

By default Pydantic is "lax": it coerces reasonable inputs (e.g. `"123"` → `int`).
`Field(strict=True)` (field-level), `model_config = ConfigDict(strict=True)` (model-level),
or `model_validate(data, strict=True)` (call-level) disable coercion — a `str` in an
`int` field fails instead of being parsed. This repo doesn't currently use strict mode;
request bodies arriving as JSON are already reasonably well-typed by the JSON parser
itself (JSON has native int/float/bool/string/null, unlike form data), so lax mode's
coercion mostly doesn't come into play for typical FastAPI JSON bodies. Consider strict
mode only for schemas parsing looser input (query params, form data, CSV import) where
silent coercion (e.g. `"true"` → `True`) could hide a client bug.
