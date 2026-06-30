import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_rejects_default_secret() -> None:
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        Settings(
            _env_file=None,
            app_env="production",
            database_url="postgresql+asyncpg://user:pass@db/app",
        )


def test_production_rejects_sqlite() -> None:
    with pytest.raises(ValidationError, match="PostgreSQL"):
        Settings(
            _env_file=None,
            app_env="production",
            secret_key="a" * 32,
            database_url="sqlite+aiosqlite:///./app.db",
        )


def test_production_accepts_secure_configuration() -> None:
    settings = Settings(
        _env_file=None,
        app_env="production",
        secret_key="a" * 32,
        database_url="postgresql+asyncpg://user:pass@db/app",
    )
    assert settings.app_env == "production"
