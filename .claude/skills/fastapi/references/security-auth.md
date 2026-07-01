# Security & auth

## This repo's actual pattern (bearer JWT, not OAuth2PasswordBearer)

This project does **not** use FastAPI's tutorial `OAuth2PasswordBearer` + form-encoded
login flow. It uses a simpler bearer-token scheme:

- `backend/app/services/auth.py` — `hash_password`/`verify_password` (passlib `bcrypt`),
  `create_access_token`/`decode_token` (`python-jose`), `authenticate_user`.
- `backend/app/core/dependencies.py` — `get_current_user` extracts the token via
  FastAPI's `HTTPBearer` security scheme, decodes it, and loads the user.
- `backend/app/api/auth.py` — the login/register routes that issue tokens.

Follow this pattern for anything auth-related in this repo — don't introduce
`OAuth2PasswordBearer` alongside it. The building blocks below explain *why* it's shaped
this way and how to extend it (e.g. adding scopes, refresh tokens).

### Extending: protecting a new route
```python
from app.core.dependencies import get_current_user, require_admin

@router.get("/mine", response_model=list[WidgetResponse])
async def list_my_widgets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...

@router.delete("/{id}", dependencies=[Depends(require_admin)])
async def delete_widget(id: int, db: AsyncSession = Depends(get_db)):
    ...  # require_admin's return value isn't needed, so it's decorator-level
```

### Extending: token payload & expiry
`create_access_token` stamps `exp` from `settings.access_token_expire_minutes`. To add
claims (e.g. `role`, `scopes`), pass them in the `data` dict — they land in the decoded
payload and `get_current_user` (or a new dependency) can read them off `payload.get(...)`.

`decode_token` currently swallows `JWTError` and returns `{}`, which `get_current_user`
treats as "no `sub`" → 401. If you need to distinguish "expired" from "malformed" for a
better client error message, check `jwt.ExpiredSignatureError` specifically before the
general `JWTError` catch.

## Password hashing

Never store or compare plaintext passwords. `passlib.context.CryptContext` with
`schemes=["bcrypt"]` (already set up in `services/auth.py`) is the standard choice —
`deprecated="auto"` lets you add a stronger scheme later and passlib will
auto-upgrade hashes on next successful login without a migration.

## FastAPI's built-in security utilities (background, for reference)

FastAPI ships `fastapi.security` classes that plug into `Depends()` and describe the auth
scheme in OpenAPI (so `/docs` shows an "Authorize" button):

- `HTTPBearer` — what this repo uses. Extracts the raw bearer token from
  `Authorization: Bearer <token>`; you decode/validate it yourself.
- `OAuth2PasswordBearer(tokenUrl=...)` — the tutorial's standard flow, expects a
  `POST {tokenUrl}` with `application/x-www-form-urlencoded` `username`/`password`
  (via `OAuth2PasswordRequestForm`), returning `{"access_token": ..., "token_type": "bearer"}`.
- `HTTPBasic` — for HTTP Basic auth; compare credentials with `secrets.compare_digest`,
  never `==`, to avoid timing attacks.

### OAuth2 scopes (if this repo ever needs fine-grained permissions)
`OAuth2PasswordBearer(tokenUrl=..., scopes={"projects:read": "...", "projects:write": "..."})`
lets route dependencies declare `Security(get_current_user, scopes=["projects:write"])`
instead of `Depends(...)` — FastAPI checks the token's `scope` claim against the
declared scopes and raises 401 automatically on mismatch. This is heavier than the
`require_admin`-style role check already in this repo; only reach for it if role-based
checks stop being granular enough.

## Common pitfalls

- **Comparing secrets with `==`** leaks timing information; use `secrets.compare_digest`
  for any raw string/token comparison outside of JWT verification (JWT libraries already
  do this correctly internally).
- **Returning different error messages** for "user not found" vs "wrong password" leaks
  which emails are registered — `authenticate_user` in this repo correctly collapses both
  to `None` → a single generic "invalid credentials" response.
- **Long-lived access tokens without refresh tokens** force re-login on expiry with no
  graceful renewal. If UX requires staying logged in, add a refresh-token flow rather than
  just extending `access_token_expire_minutes` indefinitely.
