from httpx import AsyncClient


async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


async def test_readiness(client: AsyncClient):
    r = await client.get("/ready")
    assert r.status_code == 200
    assert r.json() == {"status": "ready"}


async def test_register(client: AsyncClient):
    r = await client.post(
        "/auth/register", json={"name": "Alice", "email": "alice@test.com", "password": "secret123"}
    )
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
    await client.post(
        "/auth/register", json={"name": "Bob", "email": "bob@test.com", "password": "password123"}
    )
    r = await client.post("/auth/login", json={"email": "bob@test.com", "password": "password123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/auth/register", json={"name": "Bob", "email": "bob@test.com", "password": "password123"}
    )
    r = await client.post("/auth/login", json={"email": "bob@test.com", "password": "wrong"})
    assert r.status_code == 401


async def test_me(client: AsyncClient):
    await client.post(
        "/auth/register",
        json={"name": "Carol", "email": "carol@test.com", "password": "password123"},
    )
    login = await client.post(
        "/auth/login", json={"email": "carol@test.com", "password": "password123"}
    )
    token = login.json()["access_token"]
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "carol@test.com"


async def test_me_no_token(client: AsyncClient):
    r = await client.get("/auth/me")
    assert r.status_code in (401, 403)


async def test_login_with_different_email_case(client: AsyncClient):
    """Register with mixed-case email; login must succeed with any casing."""
    await client.post(
        "/auth/register",
        json={"name": "Dave", "email": "Dave@Test.com", "password": "password123"},
    )
    # Login with all-lowercase
    r1 = await client.post(
        "/auth/login", json={"email": "dave@test.com", "password": "password123"}
    )
    assert r1.status_code == 200, r1.text
    assert "access_token" in r1.json()

    # Login with all-uppercase
    r2 = await client.post(
        "/auth/login", json={"email": "DAVE@TEST.COM", "password": "password123"}
    )
    assert r2.status_code == 200, r2.text
    assert "access_token" in r2.json()


async def test_register_email_stored_lowercase(client: AsyncClient):
    """Registered email is always returned in lowercase regardless of input casing."""
    r = await client.post(
        "/auth/register",
        json={"name": "Eve", "email": "EVE@Test.com", "password": "password123"},
    )
    assert r.status_code == 201
    assert r.json()["email"] == "eve@test.com"


async def test_register_duplicate_email_case_insensitive(client: AsyncClient):
    """Registering with a casing variant of an existing email must be rejected."""
    await client.post(
        "/auth/register",
        json={"name": "Frank", "email": "frank@test.com", "password": "password123"},
    )
    r = await client.post(
        "/auth/register",
        json={"name": "Frank2", "email": "FRANK@TEST.COM", "password": "password123"},
    )
    assert r.status_code in (400, 409)
