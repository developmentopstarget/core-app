# Models & fields

## This repo's Create/Update/Response DTO pattern

`app/schemas/project.py` establishes the pattern to follow for every new resource:
```python
class ProjectResponse(BaseModel):
    id: int
    title: str
    status: str
    progress: int = Field(ge=0, le=100)
    owner_id: int
    created_at: datetime
    milestones: list[MilestoneResponse] = []
    model_config = {"from_attributes": True}   # validate from an ORM object

class ProjectCreate(BaseModel):
    title: str
    status: ProjectStatus = "active"           # Literal type, not bare str
    progress: int = Field(default=0, ge=0, le=100)
    owner_id: int
    milestones: list[MilestoneCreate] = []

class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: ProjectStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    # every field optional -> combine with .model_dump(exclude_unset=True) for PATCH
```
Three separate classes, not one model reused everywhere. This matters because a single
shared model tends to either over-expose fields on create (e.g. accepting a client-set
`id`) or make required fields optional everywhere, silently weakening validation. Nested
create schemas (`milestones: list[MilestoneCreate]`) let a single request body create a
parent and its children atomically — the route/service handles building the ORM objects.

## `model_config` — the options that matter here

`model_config = {"from_attributes": True}` (dict form) or `ConfigDict(from_attributes=True)`
(preferred for new code, gives IDE autocomplete) — required for any schema that gets
constructed from a non-dict object (ORM instances, `Depends()`-injected objects, etc.):
```python
project_response = ProjectResponse.model_validate(project)   # project = SQLAlchemy ORM instance
```
Without `from_attributes=True`, `model_validate()` only accepts dict-like input and
raises on an arbitrary object. FastAPI calls this automatically when a route's
`response_model` differs from the returned object's type — this is *why* every
`*Response` schema in this repo needs the flag even though nothing in `app/schemas/`
calls `model_validate()` explicitly.

Other config worth knowing (set on new schemas only if the specific behavior is needed —
don't cargo-cult a large `ConfigDict` onto every model):
- `extra="forbid"` — reject unexpected keys instead of silently dropping them (default is
  `"ignore"`). Consider this for `*Create`/`*Update` request schemas where a client
  typo'd field name should be a 422, not silently ignored.
- `str_strip_whitespace=True` — auto-strip leading/trailing whitespace on string fields.
  Useful on user-entered text fields (titles, names) to avoid whitespace-only differences
  causing duplicate-looking records.
- `frozen=True` — makes instances immutable/hashable after construction. Not used in this
  repo's mutable request/response DTOs; relevant only for value-object-style models.

## Field constraints

Prefer `Field(...)` constraints over a custom validator for anything expressible
declaratively — they're faster (enforced in Rust-based `pydantic-core`), self-documenting,
and show up correctly in the generated OpenAPI schema (constraints in a custom validator
don't):
```python
title: str = Field(min_length=1, max_length=200)
progress: int = Field(ge=0, le=100)             # also gt, lt, ge, le, multiple_of
tags: list[str] = Field(max_length=10)           # max_length on a list = max item count
```
Reach for a `field_validator` (see `references/validators.md`) only when the rule can't
be expressed as a constraint — e.g. cross-checking against another field, normalizing a
value, or validating against external state.

## Default values

`Field(default=...)` (or a bare `= value`) is evaluated **once at class definition time**
for immutable defaults — safe for `int`/`str`/`None`. For a mutable default (list, dict),
Pydantic (unlike plain Python) handles `= []` / `= {}` safely by deep-copying per
instance — you don't need `Field(default_factory=list)` for this reason the way you would
with a plain dataclass, though `default_factory` is still correct and arguably clearer
intent for anything computed (e.g. `default_factory=lambda: datetime.now(UTC)`, matching
this repo's SQLAlchemy `mapped_column(default=lambda: ...)` convention on the ORM side).

## `computed_field`

Adds a derived, read-only property to serialized output (and to the JSON Schema) without
it being a real settable field:
```python
class ProjectResponse(BaseModel):
    progress: int
    milestones: list[MilestoneResponse]

    @computed_field
    @property
    def is_complete(self) -> bool:
        return self.progress >= 100
```
Use this instead of computing derived values in the route/service and stuffing them onto
the schema by hand — it keeps the derivation next to the schema it belongs to, and it's
automatically included whenever the model is serialized (`model_dump()`, FastAPI's JSON
response, etc.) without extra wiring.

## Excluding fields from output

`Field(exclude=True)` on a schema field removes it from **all** serialization, even
though it's still a real, settable field on the model (useful for something like an
internal-only field that must exist for validation/business logic but should never reach
the client). This repo instead avoids the need for this by having a `*Response` schema
that simply never declares sensitive fields (e.g. `UserResponse` has no
`hashed_password`) — prefer that approach (a response schema that's a strict subset of
fields) over `exclude=True` sprinkled on a shared model, since a missing-by-design field
is harder to accidentally re-expose than an `exclude=True` flag someone could remove.
