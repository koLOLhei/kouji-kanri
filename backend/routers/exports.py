"""Export (CSV出力) router."""

import csv
import io
from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models.daily_report import DailyReport
from models.worker import Attendance
from models.cost import CostBudget, CostActual
from models.inspection import Inspection
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/exports", tags=["exports"])


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    if not rows:
        output = io.StringIO()
        output.write("")
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/daily-reports")
def export_daily_reports(
    project_id: str,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(DailyReport).filter(DailyReport.project_id == project_id)
    if date_from:
        q = q.filter(DailyReport.report_date >= date_from)
    if date_to:
        q = q.filter(DailyReport.report_date <= date_to)
    reports = q.order_by(DailyReport.report_date).all()
    rows = [
        {
            "日付": r.report_date.isoformat(),
            "天候(午前)": r.weather_morning or "",
            "天候(午後)": r.weather_afternoon or "",
            "最高気温": r.temperature_max or "",
            "最低気温": r.temperature_min or "",
            "作業内容": r.work_description or "",
            "作業員数": r.worker_count or "",
            "特記事項": r.special_notes or "",
            "安全事項": r.safety_notes or "",
            "ステータス": r.status,
        }
        for r in reports
    ]
    return _csv_response(rows, "daily_reports.csv")


@router.get("/attendance")
def export_attendance(
    project_id: str,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Attendance).filter(Attendance.project_id == project_id)
    if date_from:
        q = q.filter(Attendance.work_date >= date_from)
    if date_to:
        q = q.filter(Attendance.work_date <= date_to)
    records = q.order_by(Attendance.work_date).all()
    rows = [
        {
            "日付": a.work_date.isoformat(),
            "作業員ID": a.worker_id,
            "出勤": a.check_in.isoformat() if a.check_in else "",
            "退勤": a.check_out.isoformat() if a.check_out else "",
            "作業時間": a.work_hours or "",
            "勤務種別": a.work_type,
            "備考": a.notes or "",
        }
        for a in records
    ]
    return _csv_response(rows, "attendance.csv")


@router.get("/costs")
def export_costs(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budgets = db.query(CostBudget).filter(CostBudget.project_id == project_id).all()
    actuals = db.query(CostActual).filter(CostActual.project_id == project_id).order_by(CostActual.expense_date).all()

    rows = []
    for b in budgets:
        rows.append({
            "種別": "予算",
            "カテゴリ": b.category,
            "サブカテゴリ": b.subcategory or "",
            "金額": b.budgeted_amount,
            "日付": "",
            "業者名": "",
            "摘要": b.description or "",
        })
    for a in actuals:
        rows.append({
            "種別": "実績",
            "カテゴリ": a.category,
            "サブカテゴリ": a.subcategory or "",
            "金額": a.amount,
            "日付": a.expense_date.isoformat() if a.expense_date else "",
            "業者名": a.vendor_name or "",
            "摘要": a.description or "",
        })
    return _csv_response(rows, "costs.csv")


@router.get("/inspections")
def export_inspections(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inspections = db.query(Inspection).filter(
        Inspection.project_id == project_id
    ).order_by(Inspection.scheduled_date).all()
    rows = [
        {
            "検査種別": i.inspection_type,
            "タイトル": i.title,
            "予定日": i.scheduled_date.isoformat() if i.scheduled_date else "",
            "実施日": i.actual_date.isoformat() if i.actual_date else "",
            "検査員": i.inspector_name or "",
            "検査機関": i.inspector_organization or "",
            "結果": i.result,
            "ステータス": i.status,
            "備考": i.remarks or "",
        }
        for i in inspections
    ]
    return _csv_response(rows, "inspections.csv")
