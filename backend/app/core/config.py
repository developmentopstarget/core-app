from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_env: str = "development"
    allowed_origins: list[str] = ["http://localhost:5173"]

    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    database_url: str = "sqlite+aiosqlite:///./app.db"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.app_env == "production":
            if self.secret_key == "change-me-in-production" or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
            if self.database_url.startswith("sqlite"):
                raise ValueError("DATABASE_URL must use PostgreSQL in production")
        return self


settings = Settings()
