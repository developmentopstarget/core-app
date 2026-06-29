"""
Tests covering:
- register cannot create admin regardless of payload
- bootstrap script creates a real admin user
- existing client is NOT promoted without ADMIN_PROMOTE_EXISTING=true
- existing client IS promoted with ADMIN_PROMOTE_EXISTING=true
- existing admin triggers safe no-op
- admin created via bootstrap can access admin endpoints
- cross-client project access now returns 404, not 403
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.user import User, UserRole
from app.scripts.create_admin import run_create_admin
from app.services.auth import hash_password


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _make_client_user(session_factory: async_sessionmaker, email: str = "client@test.com") -> int:
    async with session_factory() as db:
        user = User(name="Client", email=email, hashed_password=hash_password("password123"), role=UserRole.client)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user.id


async def _make_admin_user(session_factory: async_sessionmaker, email: str = "admin@test.com") -> int:
    async with session_factory() as db:
        user = User(name="Admin", email=email, hashed_password=hash_password("password123"), role=UserRole.admin)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user.id


async def _token(client: AsyncClient, email: str, password: str = "password123") -> str:
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ── Register cannot create admin ───────────────────────────────────────────────

async def test_register_always_creates_client(client: AsyncClient):
    """Sending role=admin in the register body must be ignored — user is always created as client."""
    r = await client.post(
        "/auth/register",
        json={"name": "Hacker", "email": "hacker@test.com", "password": "password123", "role": "admin"},
    )
    assert r.status_code == 201
    assert r.json()["role"] == "client"


async def test_register_without_role_field_is_client(client: AsyncClient):
    r = await client.post("/auth/register", json={"name": "Alice", "email": "alice@test.com", "password": "password123"})
    assert r.status_code == 201
    assert r.json()["role"] == "client"


# ── Bootstrap script core logic ────────────────────────────────────────────────

async def test_bootstrap_creates_admin(test_session: async_sessionmaker):
    async with test_session() as db:
        msg = await run_create_admin(db, email="admin@test.com", password="adminpass1", name="Admin")
    assert "Admin created" in msg
    assert "admin@test.com" in msg


async def test_bootstrap_admin_can_login_and_access_admin_route(
    client: AsyncClient, test_session: async_sessionmaker
):
    async with test_session() as db:
        await run_create_admin(db, email="admin@test.com", password="adminpass1", name="Admin")

    tok = await _token(client, "admin@test.com", "adminpass1")
    r = await client.get("/admin/users", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200


async def test_bootstrap_existing_admin_is_noop(test_session: async_sessionmaker):
    async with test_session() as db:
        await run_create_admin(db, email="admin@test.com", password="adminpass1", name="Admin")
        msg = await run_create_admin(db, email="admin@test.com", password="adminpass1", name="Admin")
    assert "Already admin" in msg
    assert "Nothing to do" in msg


async def test_bootstrap_existing_client_not_promoted_without_flag(test_session: async_sessionmaker):
    await _make_client_user(test_session, "client@test.com")

    async with test_session() as db:
        with pytest.raises(RuntimeError, match="ADMIN_PROMOTE_EXISTING"):
            await run_create_admin(db, email="client@test.com", password="password123", name="Client", promote_existing=False)


async def test_bootstrap_existing_client_promoted_with_flag(
    client: AsyncClient, test_session: async_sessionmaker
):
    await _make_client_user(test_session, "client@test.com")

    async with test_session() as db:
        msg = await run_create_admin(
            db, email="client@test.com", password="password123", name="Client", promote_existing=True
        )
    assert "Promoted" in msg

    tok = await _token(client, "client@test.com")
    r = await client.get("/admin/users", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200


async def test_bootstrap_short_password_rejected(test_session: async_sessionmaker):
    async with test_session() as db:
        with pytest.raises(RuntimeError, match="8 characters"):
            await run_create_admin(db, email="admin@test.com", password="short", name="Admin")


# ── Cross-client project access returns 404, not 403 ──────────────────────────

async def test_cross_client_project_returns_404(client: AsyncClient, test_session: async_sessionmaker):
    """A client probing another client's project ID must get 404, not 403."""
    from app.models.project import Project

    uid1 = await _make_client_user(test_session, "u1@test.com")
    await _make_client_user(test_session, "u2@test.com")

    async with test_session() as db:
        project = Project(title="Secret", owner_id=uid1)
        db.add(project)
        await db.commit()
        await db.refresh(project)
        pid = project.id

    tok2 = await _token(client, "u2@test.com")
    r = await client.get(f"/projects/{pid}", headers={"Authorization": f"Bearer {tok2}"})
    assert r.status_code == 404
    assert r.json()["detail"] == "Project not found"


async def test_admin_can_still_access_any_project(client: AsyncClient, test_session: async_sessionmaker):
    """Admin must not be affected by the 404 change."""
    from app.models.project import Project

    uid = await _make_client_user(test_session, "client@test.com")
    await _make_admin_user(test_session, "admin@test.com")

    async with test_session() as db:
        project = Project(title="Client Project", owner_id=uid)
        db.add(project)
        await db.commit()
        await db.refresh(project)
        pid = project.id

    tok = await _token(client, "admin@test.com")
    r = await client.get(f"/projects/{pid}", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200
    assert r.json()["id"] == pid
