"""日報写真連携 router — 日報の日付と同日の写真を返す."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from database import get_db
from models.daily_report import DailyReport
from models.photo import Photo
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(
    prefix="/api/projects/{project_id}/daily-reports/{report_id}/photos",
    tags=["daily-report-photos"],
)


@router.get("")
def list_daily_report_photos(
    project_id: str,
    report_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    report = db.query(DailyReport).filter(
        DailyReport.id == report_id,
        DailyReport.project_id == project_id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")

    verify_project_access(project_id, user, db)
    photos = (
        db.query(Photo)
        .filter(
            Photo.project_id == project_id,
            cast(Photo.created_at, Date) == report.report_date,
        )
        .order_by(Photo.created_at)
        .all()
    )
    return photos
