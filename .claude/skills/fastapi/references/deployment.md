# Deployment

## `fastapi dev` vs `fastapi run`

- `fastapi dev main.py` — dev mode: auto-reload on, binds `127.0.0.1` only (not reachable
  from outside the machine). Dev-only; resource-intensive (file watching), never use in
  production.
- `fastapi run main.py` — production mode: auto-reload off, binds `0.0.0.0` (publicly
  reachable). Internally runs Uvicorn. This is the command a container's `CMD` should use.

Both auto-detect the `app` object from `main.py` (or a couple of conventional variants).
To pin it explicitly (recommended for tools like editor extensions or CI that need it
unambiguous), set `[tool.fastapi] entrypoint = "app.main:app"`-style config in
`pyproject.toml` rather than relying on auto-detection everywhere.

## Multiple workers

A single Uvicorn process is single-core. For multi-core parallelism:
```bash
fastapi run --workers 4 main.py
# or directly:
uvicorn main:app --host 0.0.0.0 --port 8080 --workers 4
```
This only solves **replication** (using more CPU cores) — you still separately need to
handle HTTPS termination, process restarts/supervision, and startup ordering (see below).
In Kubernetes-style deployments, prefer **one process per container, workers=1**, and let
the orchestrator handle replication by running multiple container replicas instead —
simpler failure isolation and scaling than in-container multi-worker.

## Docker

Minimal production Dockerfile pattern:
```dockerfile
FROM python:3.14

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app

CMD ["fastapi", "run", "app/main.py", "--port", "80"]
# Behind Nginx/Traefik terminating HTTPS, add --proxy-headers so
# request.client / redirects reflect the real client IP and scheme:
# CMD ["fastapi", "run", "app/main.py", "--port", "80", "--proxy-headers"]
```

**Always use the exec form of `CMD`** (`["fastapi", "run", ...]`, not `fastapi run ...` as
a bare string). The shell form runs the command under `/bin/sh -c`, which becomes PID 1
and doesn't forward `SIGTERM` to the actual process — so the app never gets a graceful
shutdown signal, **lifespan shutdown code never runs**, and `docker stop`/`docker compose
down` hang for the full timeout before force-killing. This is a common silent bug: the app
still "works" until you rely on lifespan cleanup (closing DB pools, flushing logs) during
shutdown.

Order `COPY`/`RUN` so dependency installation is cached separately from app code —
`requirements.txt` copied and installed *before* `COPY ./app`, so editing app code doesn't
bust the pip-install Docker layer cache.

## HTTPS

FastAPI/Uvicorn does not terminate TLS in typical production setups — a **termination
proxy** (Nginx, Traefik, a cloud load balancer) sits in front, handles the TLS handshake,
and forwards plain HTTP to the app. If the proxy is doing this, pass `--proxy-headers` so
Uvicorn trusts `X-Forwarded-*` headers for the real scheme/client IP.

## Environment variables & config

Per this repo's `pydantic-settings` setup (see database-architecture.md), production
config is env vars, not `.env` (which is dev-only and gitignored). Whatever platform hosts
this (systemd, Docker, a PaaS) should inject `SECRET_KEY`, `DATABASE_URL`, `APP_ENV=production`,
etc. as real environment variables — the `Settings.model_validator` already refuses to
start in `production` mode with the default secret key or a `sqlite` URL, which is the
intended fail-fast behavior; don't work around it, fix the actual env config.

## Deployment concepts checklist

Beyond just running the process, production deployment needs (from FastAPI's own
deployment-concepts guidance):
- **HTTPS** — via a termination proxy (above).
- **Startup on boot** — systemd unit / container restart policy, not a manually-run
  terminal command.
- **Restarts on crash** — same mechanism as above (`Restart=always` in systemd,
  `restart: unless-stopped` in Docker Compose, or orchestrator-level for Kubernetes).
- **Replication** — multiple workers/replicas across CPU cores (see above).
- **Memory limits** — cap container memory; an unbounded process can OOM-kill the host.
- **Previous steps before start** — run Alembic migrations (`alembic upgrade head`) as a
  release step before the new process starts serving traffic, not inside the app's own
  startup/lifespan (a crash mid-migration during app boot is harder to reason about than
  a dedicated migration step failing before deploy proceeds).
