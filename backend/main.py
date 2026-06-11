"""工事管理SaaS - FastAPI entry point."""

# SECURITY NOTE — CSRF Protection (C16):
# This API uses JWT Bearer tokens sent in the Authorization header (not cookies).
# CSRF attacks are cookie-based: an attacker's page can trigger a browser to send
# cookies automatically, but cannot inject the Authorization header.  Therefore
# traditional CSRF tokens are NOT required for this service.
#
# If cookies are ever added (e.g. refresh-token cookie), they MUST be set with
# SameSite=Strict; Secure; HttpOnly to preserve this guarantee.  No endpoints
# currently use cookie-based authentication.

import os
import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine, SessionLocal
from models import *  # noqa: F401,F403
from routers import discover_routers
from middleware.rate_limit import RateLimitMiddleware
from middleware.security_headers import SecurityHeadersMiddleware
from services.seed import seed_initial_data
from services.tolerance_seed import seed_tolerance_standards
from services.storage_service import ensure_bucket
from services.logger import setup_logging

logger = logging.getLogger(__name__)


def _add_missing_columns():
    """既存テーブルに新規モデルで追加されたカラムを IF NOT EXISTS で追加。

    Base.metadata.create_all は新規テーブルしか作らず既存テーブルへのカラム追加を行わない。
    本番DBが旧来 _run_migrations 運用のため、Alembic履歴と不整合。
    ここで明示的に「ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...」を発行する。
    PostgreSQL 9.6+ で `IF NOT EXISTS` 構文がサポートされる。
    """
    from sqlalchemy import text
    migrations = [
        ("subcontractors", "contact_person", "VARCHAR(255)"),
        ("subcontractors", "trade", "VARCHAR(100)"),
        ("ky_activities", "tenant_id", "VARCHAR(36)"),
        ("safety_patrols", "tenant_id", "VARCHAR(36)"),
        ("incident_reports", "tenant_id", "VARCHAR(36)"),
        ("safety_trainings", "tenant_id", "VARCHAR(36)"),
        ("worker_orientations", "tenant_id", "VARCHAR(36)"),
        # tenants: 請求書発行・会社情報
        ("tenants", "invoice_registration_number", "VARCHAR(50)"),
        ("tenants", "bank_info", "JSON"),
        ("tenants", "company_address", "VARCHAR(500)"),
        ("tenants", "company_phone", "VARCHAR(50)"),
        ("tenants", "representative_name", "VARCHAR(255)"),
        ("tenants", "seal_image_key", "VARCHAR(500)"),
        # estimates: 版管理・テンプレ・原価/利益・承認フロー
        ("estimates", "parent_estimate_id", "VARCHAR(36)"),
        ("estimates", "revision_no", "INTEGER DEFAULT 0"),
        ("estimates", "snapshot_json", "JSON"),
        ("estimates", "project_type_template_id", "VARCHAR(36)"),
        ("estimates", "project_id", "VARCHAR(36)"),
        ("estimates", "cost_subtotal", "BIGINT DEFAULT 0"),
        ("estimates", "gross_profit", "BIGINT DEFAULT 0"),
        ("estimates", "gross_profit_rate", "FLOAT DEFAULT 0"),
        ("estimates", "conditions_html", "TEXT"),
        ("estimates", "approval_status", "VARCHAR(30) DEFAULT 'not_submitted'"),
        ("estimates", "approved_at", "TIMESTAMP"),
        ("estimates", "approved_by", "VARCHAR(36)"),
        # invoices: 出来高請求・追加項目・監査用
        ("invoices", "kind", "VARCHAR(30) DEFAULT 'progress'"),
        ("invoices", "source_progress_statement_id", "VARCHAR(36)"),
        ("invoices", "additional_items", "JSON"),
        ("invoices", "updated_at", "TIMESTAMP"),
        ("invoices", "created_by", "VARCHAR(36)"),
    ]
    with engine.begin() as conn:
        for table, col, col_type in migrations:
            try:
                conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{col}" {col_type}'))
            except Exception as e:
                logger.warning(f"[init] ADD COLUMN {table}.{col} failed: {e}")

        # 追加インデックス・ユニーク制約 (Alembic 不使用のため起動時に冪等適用)
        # SaaSセキュリティ上の致命点: 同テナント内で email が重複すると
        # 認証境界が壊れるため、複合ユニークインデックスを強制する。
        unique_indexes = [
            (
                "uq_users_tenant_email",
                'CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_tenant_email" '
                'ON "users" ("tenant_id", "email")',
            ),
        ]
        for idx_name, ddl in unique_indexes:
            try:
                conn.execute(text(ddl))
            except Exception as e:
                logger.warning(f"[init] CREATE UNIQUE INDEX {idx_name} failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # G55: Structured JSON logging
    setup_logging()
    # DB初期化:
    #   - 既存テーブルへの新規カラム追加: _add_missing_columns() で ALTER TABLE ADD COLUMN IF NOT EXISTS
    #   - 新規テーブルは Base.metadata.create_all で作成
    #   - Alembic は既存DB履歴と整合しないため、本番ではスキップ
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("[init] Base.metadata.create_all applied (idempotent)")
        _add_missing_columns()
        logger.info("[init] _add_missing_columns applied")
        db = SessionLocal()
        try:
            seed_initial_data(db)
            seed_tolerance_standards(db)
        finally:
            db.close()
        logger.info("[init] DB setup complete")
    except Exception as e:
        logger.error(f"[init] DB setup failed: {e}", exc_info=True)
    try:
        ensure_bucket()
    except Exception as e:
        logger.warning(f"[init] S3 bucket setup failed: {e}")
    yield


# G54: Error monitoring — set SENTRY_DSN env var to enable
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=_sentry_dsn, traces_sample_rate=0.1)
        print("[init] Sentry enabled", flush=True)
    except ImportError:
        print("[init] sentry-sdk not installed, skipping", flush=True)

# 本番では /docs /redoc /openapi.json を無効化（情報漏洩防止）
# 開発時は環境変数 ENABLE_DOCS=1 で明示的に有効化
_is_prod = bool(os.environ.get("RENDER") or os.environ.get("PRODUCTION"))
_enable_docs = os.environ.get("ENABLE_DOCS") == "1" or not _is_prod

app = FastAPI(
    title="工事管理SaaS",
    description="公共建築工事 案件管理・写真管理・書類自動生成プラットフォーム",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _enable_docs else None,
    redoc_url="/redoc" if _enable_docs else None,
    openapi_url="/openapi.json" if _enable_docs else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://kouji.soara-mu.jp",
        "https://kamo.soara-mu.jp",
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (applied after CORS so CORS headers are still set on 429 responses)
app.add_middleware(RateLimitMiddleware)

# Security headers (OWASP set: X-Frame-Options, CSP, HSTS, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# API Versioning (E38):
# Current API is v1. All routes are served at /api/* which corresponds to /api/v1/*.
# Versioning strategy:
#   - Current routes remain at /api/* (backwards-compatible)
#   - When breaking changes are needed, introduce /api/v2/* prefix in a new router set
#   - The routers/ package naming convention supports this: v2 routers go in routers/v2/
# No action needed now — this documents the current state as v1 for future migration.

# Routers — auto-discovered from routers/ package
for r in discover_routers():
    app.include_router(r)


@app.get("/api/health")
def health():
    import os
    from services.storage_service import _use_s3, STORAGE_DIR, _RENDER_PERSISTENT_PATH
    is_render = os.environ.get("RENDER") == "true"
    using_persistent = str(STORAGE_DIR) == str(_RENDER_PERSISTENT_PATH)
    if _use_s3:
        storage_status = "s3"
    elif is_render and not using_persistent:
        storage_status = "local (WARNING: files will be lost on redeploy — configure S3/R2 or attach a persistent disk)"
    elif using_persistent:
        storage_status = f"persistent_disk ({STORAGE_DIR})"
    else:
        storage_status = f"local ({STORAGE_DIR})"
    return {"status": "ok", "service": "kouji-kanri", "storage": storage_status}


@app.get("/api/files/{path:path}")
def serve_file(path: str):
    """Serve locally stored files (dev mode without S3)."""
    from urllib.parse import unquote
    from fastapi import HTTPException
    from fastapi.responses import FileResponse
    from services.storage_service import get_local_file
    # Double-decode to catch %2e%2e and similar bypass attempts
    decoded = unquote(unquote(path))
    if ".." in decoded or decoded.startswith("/") or "\\" in decoded or "\x00" in decoded:
        raise HTTPException(status_code=400, detail="Invalid file path")
    filepath = get_local_file(path)
    if not filepath:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)
