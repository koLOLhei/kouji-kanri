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
import re
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
from services.seed import seed_initial_data
from services.tolerance_seed import seed_tolerance_standards
from services.storage_service import ensure_bucket
from services.logger import setup_logging


# C19: SQL identifier whitelist — table/column names used in _run_migrations are
# all hardcoded constants, but we validate them anyway to guard against future
# accidental dynamic values being introduced.
def _validate_identifier(name: str) -> bool:
    """Return True only if `name` is a safe SQL identifier (lowercase letters, digits, underscores)."""
    return bool(re.match(r'^[a-z_][a-z0-9_]*$', name))


def _run_migrations(engine):
    """Add missing columns to existing tables (safe to run repeatedly, idempotent).

    Uses a PostgreSQL advisory lock (pg_advisory_lock) to prevent race
    conditions when multiple workers start simultaneously.
    Each column is handled independently so one failure does not abort others.

    TODO: Migrate to Alembic for full schema management.
    The ``alembic/`` directory already exists (with an empty ``versions/``
    folder) but ``alembic.ini`` and ``alembic/env.py`` have not been created
    yet.  Steps to adopt Alembic:
      1. ``pip install alembic`` (add to requirements.txt)
      2. ``alembic init alembic`` from the backend directory
      3. Edit ``alembic/env.py``:
         - Set ``target_metadata = Base.metadata``
         - Import all models (``from models import *``)  # noqa: F401
         - Point ``sqlalchemy.url`` at the DATABASE_URL env var
      4. ``alembic revision --autogenerate -m "initial"``
      5. ``alembic upgrade head``
      6. Replace this function and the ``Base.metadata.create_all`` call in
         ``lifespan`` with ``alembic upgrade head`` (subprocess or via
         ``alembic.config.main``).
    """
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    migrations = [
        ("phases", "duration_days", "INTEGER"),
        ("phases", "depends_on", "JSONB"),
        ("phases", "progress_percent", "INTEGER DEFAULT 0"),
        ("photos", "work_type", "VARCHAR(100)"),
        ("photos", "work_subtype", "VARCHAR(100)"),
        ("photos", "work_detail", "VARCHAR(100)"),
        ("photos", "photo_category", "VARCHAR(50)"),
        ("photos", "photo_number", "INTEGER"),
        ("photos", "checksum", "VARCHAR(64)"),
        ("reports", "checksum", "VARCHAR(64)"),
        ("submissions", "checksum", "VARCHAR(64)"),
        ("submissions", "current_version", "INTEGER"),
        ("audit_logs", "old_values", "JSONB"),
        ("audit_logs", "new_values", "JSONB"),
        # C21: IP address + user-agent in audit logs for forensic traceability
        ("audit_logs", "ip_address", "VARCHAR(50)"),
        ("audit_logs", "user_agent", "VARCHAR(500)"),
        ("users", "token_version", "INTEGER DEFAULT 0 NOT NULL"),
        # Cost approval columns
        ("cost_actuals", "approval_required", "BOOLEAN DEFAULT FALSE"),
        ("cost_actuals", "approved", "BOOLEAN DEFAULT FALSE"),
        ("cost_actuals", "approved_by", "VARCHAR(36)"),
        ("cost_actuals", "approved_at", "TIMESTAMP"),
        # E43: GreenFile extra columns (table itself is created by metadata.create_all)
        ("green_files", "rejection_reason", "TEXT"),
        ("green_files", "due_date", "TIMESTAMP"),
        # F46: Drawing approval workflow columns
        ("drawings", "drawing_category", "VARCHAR(50)"),
        ("drawings", "approval_status", "VARCHAR(30) DEFAULT 'draft'"),
        ("drawings", "approved_by", "VARCHAR(36)"),
        ("drawings", "approved_at", "TIMESTAMP"),
        ("drawings", "rejection_reason", "TEXT"),
    ]
    with engine.connect() as conn:
        # Advisory lock prevents race conditions in multi-worker deployments.
        # Released automatically when the connection closes.
        conn.execute(text("SELECT pg_advisory_lock(12345)"))
        try:
            for table, col, col_type in migrations:
                # C19: Validate identifier before interpolating into SQL
                if not _validate_identifier(table) or not _validate_identifier(col):
                    print(f"[migrate] REJECTED unsafe identifier '{table}'.'{col}'", flush=True)
                    continue
                if table in insp.get_table_names():
                    existing = [c["name"] for c in insp.get_columns(table)]
                    if col not in existing:
                        try:
                            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                            conn.commit()
                            print(f"[migrate] Added {table}.{col}", flush=True)
                        except Exception as e:
                            conn.rollback()
                            print(f"[migrate] Skipped {table}.{col}: {e}", flush=True)
                    else:
                        print(f"[migrate] {table}.{col} already exists, skipping", flush=True)
            # A6: Performance indexes — run after column migrations
            index_migrations = [
                "CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id)",
                # photos.tenant_id は存在しない（project_id経由で間接参照）ため削除
                "CREATE INDEX IF NOT EXISTS idx_daily_reports_project_id ON daily_reports(project_id)",
                "CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_reports(report_date)",
                "CREATE INDEX IF NOT EXISTS idx_phases_project_id ON phases(project_id)",
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id)",
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_cost_actuals_project_id ON cost_actuals(project_id)",
                "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON submissions(project_id)",
            ]
            for idx_sql in index_migrations:
                try:
                    conn.execute(text(idx_sql))
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    print(f"[migrate] Index skipped: {e}", flush=True)
        finally:
            conn.execute(text("SELECT pg_advisory_unlock(12345)"))
            conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # G55: Structured JSON logging
    setup_logging()
    # DB初期化: Alembic → create_all(新テーブル補完) → 手動マイグレーション(レガシー)
    try:
        # Alembic migration (primary)
        try:
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config(str(Path(__file__).parent / "alembic.ini"))
            alembic_cfg.set_main_option("script_location", str(Path(__file__).parent / "alembic"))
            command.upgrade(alembic_cfg, "head")
            print("[init] Alembic migrations applied", flush=True)
        except Exception as e:
            print(f"[init] Alembic migration skipped: {e}", flush=True)
        # Fallback: create_all for any tables not yet in Alembic
        Base.metadata.create_all(bind=engine)
        # Legacy column migrations (will be removed once fully migrated to Alembic)
        _run_migrations(engine)
        db = SessionLocal()
        try:
            seed_initial_data(db)
            seed_tolerance_standards(db)
        finally:
            db.close()
        print("[init] DB setup complete", flush=True)
    except Exception as e:
        print(f"[Warning] DB setup failed: {e}", flush=True)
    try:
        ensure_bucket()
    except Exception as e:
        print(f"[Warning] S3 bucket setup failed: {e}", flush=True)
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

app = FastAPI(
    title="工事管理SaaS",
    description="公共建築工事 案件管理・写真管理・書類自動生成プラットフォーム",
    version="1.0.0",
    lifespan=lifespan,
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
