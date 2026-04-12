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
from routers import approval_workflow, document_versions, file_integrity, documents_gen, quality
from routers import electronic_delivery
from routers import schedule as schedule_router
from routers import dashboard, design_changes, subcontractor_evaluations
from routers import work_packages
from routers import concrete, staffing, legal_inspections, company_dashboard, performance, material_approvals
from routers import (
    steel_inspections, instructions, special_specs, finish_samples,
    completion_drawings, sales_pipeline, ve_proposals, photo_guides,
    drawing_mappings, telemetry, daily_report_photos, ncr_templates,
    facilities, client_portal,
    photo_album, batch_documents, inspection_schedules, external_api,
    crm, entity_links, project_history,
    cron_tasks, data_export, onboarding, project_members,
    estimates, invoices, government_filings, handover,
    platform, business_flows,
    contact_form,
    chat_leads,
    user_tasks, announcements,
    construction_loans, painting,
)
from middleware.rate_limit import RateLimitMiddleware
from services.seed import seed_initial_data
from services.tolerance_seed import seed_tolerance_standards
from services.storage_service import ensure_bucket


def _run_migrations(engine):
    """Add missing columns to existing tables (safe to run repeatedly, idempotent).

    Uses a PostgreSQL advisory lock (pg_advisory_lock) to prevent race
    conditions when multiple workers start simultaneously.
    Each column is handled independently so one failure does not abort others.
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
app.include_router(approval_workflow.router)
app.include_router(document_versions.router)
app.include_router(file_integrity.router)
app.include_router(documents_gen.router)
app.include_router(quality.router)
app.include_router(electronic_delivery.router)
app.include_router(schedule_router.router)
app.include_router(dashboard.router)
app.include_router(design_changes.router)
app.include_router(subcontractor_evaluations.router)
app.include_router(work_packages.router)
app.include_router(concrete.router)
app.include_router(staffing.tenant_router)
app.include_router(staffing.project_router)
app.include_router(legal_inspections.router)
app.include_router(company_dashboard.router)
app.include_router(performance.router)
app.include_router(material_approvals.router)
app.include_router(steel_inspections.router)
app.include_router(instructions.router)
app.include_router(special_specs.router)
app.include_router(finish_samples.router)
app.include_router(completion_drawings.router)
app.include_router(sales_pipeline.router)
app.include_router(ve_proposals.router)
app.include_router(photo_guides.router)
app.include_router(drawing_mappings.router)
app.include_router(telemetry.router)
app.include_router(daily_report_photos.router)
app.include_router(ncr_templates.router)
app.include_router(facilities.router)
app.include_router(client_portal.admin_router)
app.include_router(client_portal.public_router)
app.include_router(photo_album.router)
app.include_router(batch_documents.router)
app.include_router(inspection_schedules.router)
app.include_router(external_api.router)
app.include_router(crm.router)
app.include_router(entity_links.router)
app.include_router(project_history.router)
app.include_router(cron_tasks.router)
app.include_router(data_export.router)
app.include_router(onboarding.router)
app.include_router(project_members.router)
app.include_router(estimates.router)
app.include_router(invoices.router)
app.include_router(government_filings.router)
app.include_router(handover.router)
app.include_router(user_tasks.router)
app.include_router(announcements.router)
app.include_router(platform.router)
app.include_router(business_flows.router)
app.include_router(chat_leads.router)
app.include_router(contact_form.router)
app.include_router(construction_loans.router)
app.include_router(painting.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "kouji-kanri"}


@app.get("/api/files/{path:path}")
def serve_file(path: str):
    """Serve locally stored files (dev mode without S3)."""
    from fastapi import HTTPException
    from fastapi.responses import FileResponse
    from services.storage_service import get_local_file
    # Reject obviously dangerous path components before hitting the filesystem
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")
    filepath = get_local_file(path)
    if not filepath:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)
