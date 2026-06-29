from httpx import AsyncClient


async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


async def test_register(client: AsyncClient):
    r = await client.post("/auth/register", json={"name": "Alice", "email": "alice@test.com", "password": "secret123"})
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "alice@test.com"
    assert data["role"] == "client"


async def test_register_duplicate_email(client: AsyncClient):
    payload = {"name": "Alice", "email": "alice@test.com", "password": "secret123"}
    await client.post("/auth/register", json=payload)
    r = await client.post("/auth/register", json=payload)
    assert r.status_code == 400


async def test_login(client: AsyncClient):
    await client.post("/auth/register", json={"name": "Bob", "email": "bob@test.com", "password": "password123"})
    r = await client.post("/auth/login", json={"email": "bob@test.com", "password": "password123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_login_wrong_password(client: AsyncClient):
    await client.post("/auth/register", json={"name": "Bob", "email": "bob@test.com", "password": "password123"})
    r = await client.post("/auth/login", json={"email": "bob@test.com", "password": "wrong"})
    assert r.status_code == 401


async def test_me(client: AsyncClient):
    await client.post("/auth/register", json={"name": "Carol", "email": "carol@test.com", "password": "password123"})
    login = await client.post("/auth/login", json={"email": "carol@test.com", "password": "password123"})
    token = login.json()["access_token"]
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "carol@test.com"


async def test_me_no_token(client: AsyncClient):
    r = await client.get("/auth/me")
    assert r.status_code in (401, 403)
