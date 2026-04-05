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
from routers import (
    auth, projects, phases, photos, reports, submissions, specs, tenants, regions,
    daily_reports, safety, workers, subcontractors, materials, inspections,
    costs, drawings, notifications, audit_logs, calendar_routes, exports,
    weather, corrective_actions, comments,
    document_dashboard, approval_queue, daily_workflow,
    meetings, measurements, equipment_routes, waste, search, bulk_download,
)
from services.seed import seed_initial_data
from services.storage_service import ensure_bucket


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables & seed
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_initial_data(db)
        finally:
            db.close()
    except Exception as e:
        print(f"[Warning] DB setup failed: {e}")
    # Ensure S3 bucket
    try:
        ensure_bucket()
    except Exception as e:
        print(f"[Warning] S3 bucket setup failed: {e}")
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
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(phases.router)
app.include_router(photos.router)
app.include_router(reports.router)
app.include_router(submissions.router)
app.include_router(specs.router)
app.include_router(tenants.router)
app.include_router(regions.router)
app.include_router(daily_reports.router)
app.include_router(safety.router)
app.include_router(workers.router)
app.include_router(subcontractors.router)
app.include_router(materials.router)
app.include_router(inspections.router)
app.include_router(costs.router)
app.include_router(drawings.router)
app.include_router(notifications.router)
app.include_router(audit_logs.router)
app.include_router(calendar_routes.router)
app.include_router(exports.router)
app.include_router(weather.router)
app.include_router(corrective_actions.router)
app.include_router(comments.router)
app.include_router(document_dashboard.router)
app.include_router(approval_queue.router)
app.include_router(daily_workflow.router)
app.include_router(meetings.router)
app.include_router(measurements.router)
app.include_router(equipment_routes.equipment_router)
app.include_router(equipment_routes.project_equipment_router)
app.include_router(waste.router)
app.include_router(search.router)
app.include_router(bulk_download.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "kouji-kanri"}


@app.get("/api/files/{path:path}")
def serve_file(path: str):
    """Serve locally stored files (dev mode without S3)."""
    from fastapi.responses import FileResponse
    from services.storage_service import get_local_file
    filepath = get_local_file(path)
    if not filepath:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)
