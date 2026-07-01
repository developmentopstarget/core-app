# Core API building

## Path operations & routers

Group related endpoints with `APIRouter`, then mount it in `main.py`. Set `prefix` and
`tags` on the router, not on each decorator:

```python
router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/")       # -> GET /projects/
@router.get("/{id}")   # -> GET /projects/{id}
```

**Order matters within a router.** A fixed-segment path must be declared before a
variable one that could shadow it:
```python
@router.get("/me")        # must come first
@router.get("/{user_id}") # otherwise "/me" is parsed as user_id="me"
```

For deep hierarchies, nest routers with their own `prefix`/`dependencies`, then
`include_router()` the sub-router into the parent before including the parent in the app.
A router-level `dependencies=[Depends(require_admin)]` applies to every route on it —
useful for an entire admin sub-API without repeating `Depends()` on each handler.

## Path & query parameters

Path params are declared as typed function args matching `{placeholders}` in the route
string; FastAPI coerces and validates them (a non-`int` value on an `int` param is a 422,
not a 500). Everything else becomes a query param unless it's a Pydantic model (body) or an
explicit `Body()`.

Add validation/metadata with `Annotated` + `Query`/`Path`:
```python
from typing import Annotated
from fastapi import Query, Path

@router.get("/items/{item_id}")
async def read_item(
    item_id: Annotated[int, Path(gt=0)],
    q: Annotated[str | None, Query(max_length=50)] = None,
):
    ...
```
Prefer the `Annotated` form over default-value `Query(...)` — it keeps the parameter's
actual default (or lack of one) separate from its metadata, and works cleanly with
reusable type aliases (`UserId = Annotated[int, Path(gt=0)]`).

## Request bodies

A Pydantic `BaseModel` argument is parsed from the JSON body automatically. Multiple
`BaseModel` args in one signature become nested body keys unless you add `embed=True`
(single model) or just declare multiple models (FastAPI auto-embeds them under their
param names). Mix body models with `Body(...)` singleton fields, path params, and query
params freely in the same signature — FastAPI figures out the source of each from its type.

Nest models to represent nested JSON; FastAPI validates recursively and reflects nested
schemas in OpenAPI.

For **partial updates** (`PATCH`), use `model_dump(exclude_unset=True)` on the incoming
payload so you only overwrite fields the client actually sent, not fields that used
their default:
```python
update_data = payload.model_dump(exclude_unset=True)
for field, value in update_data.items():
    setattr(existing, field, value)
```

## Response models & status codes

Declare `response_model=` (or a return type annotation FastAPI reads the same way) to
**filter and shape output** — this is the primary way to avoid leaking fields like
password hashes: define a separate `UserResponse` schema without `hashed_password`, and
return the ORM object directly; FastAPI drops anything not on the response schema.

```python
@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
```

Use `response_model_exclude_unset=True` to omit fields that were never set (useful when
the response model has many optional fields with defaults you don't want echoed back).

For multiple possible response shapes (e.g. success vs error body) on the same route,
document them via `responses={404: {"model": ErrorResponse}}` on the decorator — this
only affects OpenAPI docs, not runtime behavior.

## Error handling

Raise `HTTPException` from anywhere in the call stack below the route handler (including
services) — FastAPI catches it and returns the JSON error response:
```python
raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
```
`detail` can be any JSON-serializable value (str, dict, list), not just a string.

For app-wide custom exception types, register a handler instead of catching everywhere:
```python
class InsufficientFundsError(Exception):
    def __init__(self, account_id: str):
        self.account_id = account_id

@app.exception_handler(InsufficientFundsError)
async def insufficient_funds_handler(request: Request, exc: InsufficientFundsError):
    return JSONResponse(status_code=409, content={"detail": f"Account {exc.account_id} is low"})
```
This keeps services free of HTTP-layer concerns (`HTTPException` is an HTTP-layer type;
raising domain exceptions from `services/` and translating them in one place is cleaner
than importing `fastapi` into service modules).

To override FastAPI's default 422 validation error shape, add a handler for
`RequestValidationError` from `fastapi.exceptions`.

## CORS

Add once in `main.py`, not per-route:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # exact origins, not "*" if allow_credentials=True
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
`allow_origins=["*"]` and `allow_credentials=True` together are rejected by browsers —
list explicit origins when credentials (cookies/auth headers) are involved.

## Background tasks

For fire-and-forget work after returning a response (e.g. sending a notification email),
use `BackgroundTasks` rather than blocking the response or standing up a task queue:
```python
from fastapi import BackgroundTasks

@router.post("/")
async def post_widget(payload: WidgetCreate, background_tasks: BackgroundTasks, ...):
    widget = await create_widget(db, data=payload)
    background_tasks.add_task(send_notification, widget.owner_email, widget.id)
    return widget
```
Background tasks run in-process after the response is sent — they do not survive a
process restart and are not a substitute for a real queue (Celery/RQ/arq) for anything
that must be durable or long-running.

## Streaming & server-sent events

`StreamingResponse` for arbitrary chunked output; for SSE specifically, yield
`"data: ...\n\n"`-formatted strings with `media_type="text/event-stream"`, or use the
`sse-starlette` package for a higher-level API with reconnect/event-id support.

## File uploads

`UploadFile` (not raw `bytes`) for uploads over a few MB — it spools to disk past a size
threshold instead of loading the whole file into memory:
```python
@router.post("/upload")
async def upload(file: UploadFile):
    contents = await file.read()
```

## Static files

Mount a directory for direct serving (e.g. built frontend assets, user uploads) via
`app.mount("/static", StaticFiles(directory="static"), name="static")`. This is
separate from Vite's own dev server in this repo — only relevant for serving files FastAPI
itself owns (e.g. uploaded avatars), not for the frontend build.
