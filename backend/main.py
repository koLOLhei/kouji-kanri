"""工事管理SaaS - FastAPI entry point."""

import os
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
        ("users", "token_version", "INTEGER DEFAULT 0 NOT NULL"),
        # Cost approval columns
        ("cost_actuals", "approval_required", "BOOLEAN DEFAULT FALSE"),
        ("cost_actuals", "approved", "BOOLEAN DEFAULT FALSE"),
        ("cost_actuals", "approved_by", "VARCHAR(36)"),
        ("cost_actuals", "approved_at", "TIMESTAMP"),
    ]
    with engine.connect() as conn:
        # Advisory lock prevents race conditions in multi-worker deployments.
        # Released automatically when the connection closes.
        conn.execute(text("SELECT pg_advisory_lock(12345)"))
        try:
            for table, col, col_type in migrations:
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
        finally:
            conn.execute(text("SELECT pg_advisory_unlock(12345)"))
            conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB初期化（同期 - テーブル作成を確実に完了させる）
    try:
        Base.metadata.create_all(bind=engine)
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

# Routers — auto-discovered from routers/ package
for r in discover_routers():
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "kouji-kanri"}


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
