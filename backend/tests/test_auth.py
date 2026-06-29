import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSession = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db() -> AsyncSession:  # type: ignore[return]
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


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
