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

    resend_api_key: str = ""
    smtp_from: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# ── Security warning for default credentials ──
import os as _os

_INSECURE_DEFAULTS = {
    "secret_key": "dev-secret-key-change-in-production",
    "database_url": "postgresql://kouji:kouji_dev_2024@localhost:5433/kouji_kanri",
}

if not _os.environ.get("KOUJI_SKIP_SECURITY_CHECK"):
    for _field, _default in _INSECURE_DEFAULTS.items():
        if getattr(settings, _field) == _default:
            _env = _os.environ.get("RENDER", _os.environ.get("VERCEL"))
            if _env or _os.environ.get("PRODUCTION"):
                import sys
                print(
                    f"\n{'='*60}\n"
                    f"[SECURITY WARNING] {_field} is using the default value!\n"
                    f"Set the {_field.upper()} environment variable before deploying.\n"
                    f"{'='*60}\n",
                    file=sys.stderr, flush=True,
                )

# アプリケーション設定
class AppSettings:
    app_domain: str = "https://kouji.soara-mu.jp"
    default_tax_rate: float = 10.0  # 消費税率(%)
    invoice_registration_number: str = ""  # 適格請求書発行事業者番号

app_settings = AppSettings()
