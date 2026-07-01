# Validators

## Field validators

`@field_validator("field_name")` runs custom logic for a single field, beyond what
`Field(...)` constraints can express:
```python
from pydantic import BaseModel, field_validator

class RegisterRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()
```
Always `@classmethod` (Pydantic calls it unbound, before an instance exists) and always
return the value — a field validator that doesn't return leaves the field as `None` on
every input, silently breaking the model. Raise `ValueError` (not `AssertionError`) to
fail validation with a 422-style error; Pydantic wraps it as a proper `ValidationError`.

`mode="before"` (raw input, pre-type-coercion) vs `mode="after"` (default; runs after
Pydantic's own type coercion/validation succeeded) vs `mode="wrap"` (full control,
receives a handler you call to invoke the rest of the validation chain — use for
try/except-around-the-normal-validation patterns, like logging validation failures).

## Model validators

For rules spanning multiple fields, use `@model_validator`, not a `field_validator` on
one field that reaches into `self`/sibling data (which doesn't work reliably —
`field_validator`s for different fields have no guaranteed ordering relative to each
other unless you use `validation_info.data`, which only contains fields already
validated at that point).

```python
from typing_extensions import Self
from pydantic import BaseModel, model_validator

class RegisterRequest(BaseModel):
    password: str
    password_confirm: str

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self
```
`mode="after"` gives you `self` with all fields already individually validated — the
pattern this repo's `Settings.validate_production_settings` in `app/core/config.py`
already uses (`@model_validator(mode="after") -> "Settings"`, returning `self`). Prefer
`mode="after"` whenever the check only needs already-valid field values (the common
case) — it's simpler and type-safe (`self` is a real instance, not raw data).

`mode="before"` receives the **raw, unvalidated input** — which is not guaranteed to be a
dict (e.g. if `from_attributes` is in play, it could be an arbitrary object). Check
`isinstance(data, dict)` before doing dict-style access:
```python
@model_validator(mode="before")
@classmethod
def strip_legacy_field(cls, data):
    if isinstance(data, dict) and "legacy_id" in data:
        data = {**data, "legacy_id": None}
    return data
```
Don't mutate `data` in place and then raise later in the same validator — under a
`Union` of models, the mutated value can leak into the next union member's validation
attempt. Build a new dict/copy instead if you need to raise conditionally afterward.

## Ordering (annotated pattern)

When multiple validators are attached via `Annotated[...]` (or the decorator form, which
Pydantic converts to the same internal representation), **before/wrap validators run
right-to-left, then after validators run left-to-right**:
```python
Annotated[str, AfterValidator(runs_3rd), AfterValidator(runs_4th), BeforeValidator(runs_2nd), WrapValidator(runs_1st)]
```
This is unintuitive — read `Annotated` metadata order carefully when stacking multiple
validators on one field. In practice, prefer a single validator function per field over
stacking several, unless composing genuinely independent, reusable pieces (e.g. a shared
`TrimmedStr = Annotated[str, BeforeValidator(str.strip)]` type alias reused across
multiple schemas).

## Raising validation errors

Three ways, in order of preference:
1. `raise ValueError("message")` — simplest, wrapped into a proper Pydantic error automatically.
2. `raise PydanticCustomError(...)` — for a structured, machine-parseable error type/context
   without the overhead of a full custom exception class.
3. `raise AssertionError` — works (Pydantic catches it too) but conventionally reserved
   for `assert` statements, not deliberate validation logic; prefer `ValueError`.

Don't raise `HTTPException` from a validator — schemas live below the HTTP layer;
FastAPI already converts any Pydantic `ValidationError` into a 422 response automatically
without a validator needing to know about `fastapi` at all.

## `InstanceOf` / `SkipValidation`

`InstanceOf[SomeClass]` validates "is this the right Python type" without Pydantic trying
to coerce/parse it — useful for fields holding non-serializable runtime objects passed
through internally (rare in a typical FastAPI request/response schema, more common in
internal service-layer dataclasses/models that also happen to use Pydantic).
`SkipValidation[T]` skips validation entirely for a field, trusting the caller — use only
for a genuinely trusted internal boundary, never on a field populated from client input.
