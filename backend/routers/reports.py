"""Report (報告書) router."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.report import Report
from models.user import User
from services.auth_service import get_current_user
from services.storage_service import generate_upload_key, upload_file, generate_presigned_url
from services.submission_engine import auto_generate_if_ready
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/reports", tags=["reports"])


@router.get("")
def list_reports(
    project_id: str,
    phase_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(Report).filter(Report.project_id == project_id)
    if phase_id:
        q = q.filter(Report.phase_id == phase_id)
    reports = q.order_by(Report.created_at.desc()).all()

    result = []
    for r in reports:
        d = {
            "id": r.id, "project_id": r.project_id, "phase_id": r.phase_id,
            "requirement_id": r.requirement_id, "report_type": r.report_type,
            "title": r.title, "status": r.status,
            "submitted_by": r.submitted_by, "reviewed_by": r.reviewed_by,
            "reviewed_at": r.reviewed_at, "created_at": r.created_at,
            "download_url": generate_presigned_url(r.file_key) if r.file_key else None,
        }
        result.append(d)
    return result


@router.post("")
async def upload_report(
    project_id: str,
    file: UploadFile = File(...),
    title: str = Form(...),
    report_type: str = Form("inspection"),
    phase_id: str | None = Form(None),
    requirement_id: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    file_data = await file.read()
    file_key = generate_upload_key(user.tenant_id, project_id, "reports", file.filename or "report.pdf")
    upload_file(file_data, file_key, file.content_type or "application/pdf")

    report = Report(
        project_id=project_id,
        phase_id=phase_id,
        requirement_id=requirement_id,
        report_type=report_type,
        title=title,
        file_key=file_key,
        status="draft",
        submitted_by=user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "title": report.title, "status": report.status}


@router.put("/{report_id}/review")
def review_report(
    project_id: str,
    report_id: str,
    action: str,  # approve or reject
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    report = db.query(Report).filter(Report.id == report_id, Report.project_id == project_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="報告書が見つかりません")

    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="actionはapproveまたはrejectを指定してください")

    report.status = "approved" if action == "approve" else "rejected"
    report.reviewed_by = user.id
    report.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    # 承認後に自動書類生成チェック
    if action == "approve" and report.phase_id:
        auto_generate_if_ready(db, report.phase_id, user.tenant_id)

    return {"id": report.id, "status": report.status}
