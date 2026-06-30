from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.project import Project
from app.models.user import User, UserRole
from app.services.auth import hash_password


async def _make_user(
    session_factory: async_sessionmaker, email: str, role: UserRole = UserRole.client
) -> int:
    async with session_factory() as db:
        user = User(
            name="Test", email=email, hashed_password=hash_password("password123"), role=role
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user.id


async def _make_project(
    session_factory: async_sessionmaker, owner_id: int, title: str = "My Project"
) -> int:
    async with session_factory() as db:
        project = Project(title=title, owner_id=owner_id)
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project.id


async def _token(client: AsyncClient, email: str) -> str:
    r = await client.post("/auth/login", json={"email": email, "password": "password123"})
    return r.json()["access_token"]


async def test_list_projects_empty(client: AsyncClient, test_session: async_sessionmaker):
    await _make_user(test_session, "a@test.com")
    token = await _token(client, "a@test.com")
    r = await client.get("/projects/", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json() == []


async def test_list_projects_own_only(client: AsyncClient, test_session: async_sessionmaker):
    uid1 = await _make_user(test_session, "u1@test.com")
    uid2 = await _make_user(test_session, "u2@test.com")
    tok1 = await _token(client, "u1@test.com")
    tok2 = await _token(client, "u2@test.com")
    await _make_project(test_session, uid1, "U1 Project")
    await _make_project(test_session, uid2, "U2 Project")

    r1 = await client.get("/projects/", headers={"Authorization": f"Bearer {tok1}"})
    r2 = await client.get("/projects/", headers={"Authorization": f"Bearer {tok2}"})
    assert len(r1.json()) == 1
    assert r1.json()[0]["title"] == "U1 Project"
    assert len(r2.json()) == 1
    assert r2.json()[0]["title"] == "U2 Project"


async def test_get_project_other_client_returns_404(
    client: AsyncClient, test_session: async_sessionmaker
):
    """Cross-client access returns 404 (not 403) so project ID existence is not leaked."""
    uid1 = await _make_user(test_session, "u1@test.com")
    await _make_user(test_session, "u2@test.com")
    tok2 = await _token(client, "u2@test.com")
    pid = await _make_project(test_session, uid1)
    r = await client.get(f"/projects/{pid}", headers={"Authorization": f"Bearer {tok2}"})
    assert r.status_code == 404


async def test_get_project_allowed_owner(client: AsyncClient, test_session: async_sessionmaker):
    uid = await _make_user(test_session, "u@test.com")
    token = await _token(client, "u@test.com")
    pid = await _make_project(test_session, uid)
    r = await client.get(f"/projects/{pid}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["id"] == pid


async def test_get_project_admin_can_access_any(
    client: AsyncClient, test_session: async_sessionmaker
):
    uid1 = await _make_user(test_session, "client@test.com")
    await _make_user(test_session, "admin@test.com", UserRole.admin)
    admin_token = await _token(client, "admin@test.com")
    pid = await _make_project(test_session, uid1)
    r = await client.get(f"/projects/{pid}", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
