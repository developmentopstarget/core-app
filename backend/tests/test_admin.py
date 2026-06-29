from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.user import User, UserRole
from app.services.auth import hash_password


async def _make_user(session_factory: async_sessionmaker, email: str, role: UserRole = UserRole.client) -> int:
    async with session_factory() as db:
        user = User(name="Test", email=email, hashed_password=hash_password("password123"), role=role)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user.id


async def _token(client: AsyncClient, email: str) -> str:
    r = await client.post("/auth/login", json={"email": email, "password": "password123"})
    return r.json()["access_token"]


async def _admin_headers(client: AsyncClient, session_factory: async_sessionmaker) -> dict:
    await _make_user(session_factory, "admin@test.com", UserRole.admin)
    tok = await _token(client, "admin@test.com")
    return {"Authorization": f"Bearer {tok}"}


async def test_client_cannot_access_admin(client: AsyncClient, test_session: async_sessionmaker):
    await _make_user(test_session, "client@test.com")
    tok = await _token(client, "client@test.com")
    r = await client.get("/admin/users", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403


async def test_admin_list_users(client: AsyncClient, test_session: async_sessionmaker):
    headers = await _admin_headers(client, test_session)
    r = await client.get("/admin/users", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


async def test_admin_create_and_list_projects(client: AsyncClient, test_session: async_sessionmaker):
    uid = await _make_user(test_session, "client@test.com")
    headers = await _admin_headers(client, test_session)

    payload = {
        "title": "Test Project",
        "owner_id": uid,
        "status": "active",
        "progress": 40,
        "milestones": [{"title": "Phase 1", "is_done": True}, {"title": "Phase 2", "is_done": False}],
    }
    r = await client.post("/admin/projects", json=payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Test Project"
    assert len(data["milestones"]) == 2

    r2 = await client.get("/admin/projects", headers=headers)
    assert r2.status_code == 200
    assert len(r2.json()) == 1


async def test_admin_update_project(client: AsyncClient, test_session: async_sessionmaker):
    uid = await _make_user(test_session, "client@test.com")
    headers = await _admin_headers(client, test_session)

    create = await client.post("/admin/projects", json={"title": "Old", "owner_id": uid}, headers=headers)
    pid = create.json()["id"]

    r = await client.patch(f"/admin/projects/{pid}", json={"title": "New", "progress": 80}, headers=headers)
    assert r.status_code == 200
    assert r.json()["title"] == "New"
    assert r.json()["progress"] == 80


async def test_admin_delete_project(client: AsyncClient, test_session: async_sessionmaker):
    uid = await _make_user(test_session, "client@test.com")
    headers = await _admin_headers(client, test_session)

    create = await client.post("/admin/projects", json={"title": "ToDelete", "owner_id": uid}, headers=headers)
    pid = create.json()["id"]

    r = await client.delete(f"/admin/projects/{pid}", headers=headers)
    assert r.status_code == 204

    r2 = await client.get("/admin/projects", headers=headers)
    assert len(r2.json()) == 0


async def test_admin_manage_milestones(client: AsyncClient, test_session: async_sessionmaker):
    uid = await _make_user(test_session, "client@test.com")
    headers = await _admin_headers(client, test_session)

    create = await client.post("/admin/projects", json={"title": "P", "owner_id": uid}, headers=headers)
    pid = create.json()["id"]

    add = await client.post(f"/admin/projects/{pid}/milestones", json={"title": "M1"}, headers=headers)
    assert add.status_code == 200
    mid = add.json()["milestones"][0]["id"]

    update = await client.patch(f"/admin/milestones/{mid}", json={"is_done": True}, headers=headers)
    assert update.status_code == 200
    assert update.json()["milestones"][0]["is_done"] is True

    delete = await client.delete(f"/admin/milestones/{mid}", headers=headers)
    assert delete.status_code == 204
