# Serialization & JSON Schema

## `model_dump()` vs `model_dump_json()`

`model_dump()` returns a Python `dict` (nested models become nested dicts); `model_dump_json()`
returns a JSON `str` directly, and handles types `dict()` can't natively serialize
(`datetime`, `UUID`, etc.) without you needing a custom JSON encoder. FastAPI calls
`model_dump()`/equivalent internally when building a response — you generally don't call
either explicitly in a route handler; you just return the model or ORM object and let
`response_model` do it.

## `exclude_unset` — this repo's PATCH pattern

`model_dump(exclude_unset=True)` returns only fields the caller actually passed when
constructing the model — fields left at their default are omitted, distinguishing "client
didn't send this field" from "client explicitly sent the default value." This is exactly
why `*Update` schemas make every field `X | None = None`: a `ProjectUpdate(title="New")`
dumps to `{"title": "New"}`, not the full schema with every other field forced to `None`,
so applying it to an ORM object only overwrites `title`. See the `sqlalchemy` skill's
`service-patterns.md` for the write-side of this (`setattr` loop over `exclude_unset`).

Related but distinct:
- `exclude_none=True` — drops fields whose *value* is `None`, regardless of whether they
  were set. Different from `exclude_unset` and rarely what you want for a PATCH payload
  (a client explicitly setting a nullable field to `null` should still update it).
- `exclude_defaults=True` — drops fields whose value equals the field's default, even if
  explicitly set to that value. Also usually not what you want for partial-update logic.

## Field-level exclusion

`Field(exclude=True)` removes a field from **every** serialization unconditionally —
appropriate for a field that must exist on the model for internal logic but should never
leave the process (this repo instead solves the "never expose this" problem by simply not
including the field on `*Response` schemas at all — see `models-fields.md` — which is the
preferred approach here). `Field(exclude_if=lambda v: v == 0)` (Pydantic 2.13+) drops the
field only when the given predicate on its value is true — useful for "don't send zero/empty
values to keep payloads small," not for hiding sensitive data (still present when the
predicate doesn't match).

`model_dump(exclude={"user", "value"})` / `include={...}` work per-call, and support
nested dict form (`exclude={"user": {"password"}}`) to reach into nested models — useful
for one-off response shaping in a route without a whole separate schema class, but prefer
a dedicated `*Response` schema for anything reused across more than one route.

## Aliases for camelCase APIs

This repo's schemas currently use snake_case field names matching the frontend's
TypeScript types directly (see `frontend/src/types/`) — if the frontend ever needs
camelCase JSON (a common REST convention), use `alias_generator`, not manual `Field(alias=...)`
on every field:
```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)
    owner_id: int   # serializes as "ownerId"
```
`populate_by_name=True` is required alongside an alias generator if you also want to
construct the model using the original Python (snake_case) field names internally (e.g.
`ProjectResponse(owner_id=1)` in Python code) rather than only via the alias. Without it,
only `ownerId=1` would be accepted as a constructor kwarg, which breaks normal internal
Python usage. `AliasChoices`/`AliasPath` (from `pydantic.aliases`) handle cases where a
field could come from more than one input key, or from a nested path in the input — not
currently needed in this repo's flat schemas.

## Customizing JSON Schema (what FastAPI's `/docs` shows)

FastAPI generates OpenAPI docs from each schema's `model_json_schema()`. To influence the
generated docs beyond what field types/constraints already produce:
```python
class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200, description="Project display title", examples=["Website redesign"])
```
`description` and `examples` on `Field()` show up directly in `/docs`. For schema-level
customization beyond individual fields, `model_config = ConfigDict(json_schema_extra={...})`
merges arbitrary extra keys into the generated schema (e.g. a custom `example` payload
for the whole object) — reach for this only when field-level `description`/`examples`
aren't enough, since it's easy for a hand-written `json_schema_extra` example to drift out
of sync with the actual schema as fields change.

`@computed_field`-decorated properties are included in `model_json_schema(mode="serialization")`
automatically (marked `readOnly: true`) but **not** in `mode="validation"` schema — correct,
since a computed field can never be part of the request body.
