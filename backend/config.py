"""Application configuration via pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://kouji:kouji_dev_2024@localhost:5433/kouji_kanri"
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 480  # 8 hours

    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin123"
    s3_bucket: str = "kouji-kanri"
    s3_region: str = "us-east-1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
