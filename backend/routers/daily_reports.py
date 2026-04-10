"""Daily report (日報) router."""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.daily_report import DailyReport
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/daily-reports", tags=["daily-reports"])


# ---------- Schemas ----------

class DailyReportCreate(BaseModel):
    report_date: date
    weather_morning: str | None = None
    weather_afternoon: str | None = None
    temperature_max: float | None = None
    temperature_min: float | None = None
    work_description: str | None = None
    worker_count: int | None = None
    equipment_used: list | None = None
    special_notes: str | None = None
    safety_notes: str | None = None


class DailyReportUpdate(BaseModel):
    weather_morning: str | None = None
    weather_afternoon: str | None = None
    temperature_max: float | None = None
    temperature_min: float | None = None
    work_description: str | None = None
    worker_count: int | None = None
    equipment_used: list | None = None
    special_notes: str | None = None
    safety_notes: str | None = None
    status: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_daily_reports(
    project_id: str,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(DailyReport).filter(DailyReport.project_id == project_id)
    if status:
        q = q.filter(DailyReport.status == status)
    if date_from:
        q = q.filter(DailyReport.report_date >= date_from)
    if date_to:
        q = q.filter(DailyReport.report_date <= date_to)
    return q.order_by(DailyReport.report_date.desc()).all()


@router.post("")
def create_daily_report(
    project_id: str,
    req: DailyReportCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    report = DailyReport(
        project_id=project_id,
        submitted_by=user.id,
        **req.model_dump(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{report_id}")
def get_daily_report(
    project_id: str,
    report_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    report = db.query(DailyReport).filter(
        DailyReport.id == report_id, DailyReport.project_id == project_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    return report


@router.put("/{report_id}")
def update_daily_report(
    project_id: str,
    report_id: str,
    req: DailyReportUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    report = db.query(DailyReport).filter(
        DailyReport.id == report_id, DailyReport.project_id == project_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    old_status = report.status
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(report, key, value)
    db.commit()
    db.refresh(report)
    # 提出時に管理者へ通知
    if old_status != "submitted" and report.status == "submitted":
        from services.notification_triggers import on_daily_report_submitted
        on_daily_report_submitted(db, user.tenant_id, project_id,
                                   str(report.report_date), user.name)
    return report


@router.delete("/{report_id}")
def delete_daily_report(
    project_id: str,
    report_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    report = db.query(DailyReport).filter(
        DailyReport.id == report_id, DailyReport.project_id == project_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    db.delete(report)
    db.commit()
    return {"status": "ok"}


@router.put("/{report_id}/approve")
def approve_daily_report(
    project_id: str,
    report_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    report = db.query(DailyReport).filter(
        DailyReport.id == report_id, DailyReport.project_id == project_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    if report.status != "submitted":
        raise HTTPException(status_code=400, detail="提出済みの日報のみ承認できます")
    report.status = "approved"
    report.approved_by = user.id
    report.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)
    # 提出者に承認通知
    if report.submitted_by:
        from services.notification_triggers import on_daily_report_approved
        on_daily_report_approved(db, user.tenant_id, project_id,
                                  report.id, report.submitted_by)
    return report
