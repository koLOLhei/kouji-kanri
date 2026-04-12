"""Usage analytics router (G58/G59)."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.project import Project
from models.photo import Photo
from models.submission import Submission
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/admin", tags=["analytics"])


@router.get("/analytics")
def get_usage_analytics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Usage statistics for the platform (tenant-scoped)."""
    tenant_id = user.tenant_id
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)

    # Active users (logged in within 30 days via login_history if available, else all users)
    try:
        from models.platform import LoginHistory
        active_users = (
            db.query(func.count(func.distinct(LoginHistory.user_id)))
            .filter(
                LoginHistory.tenant_id == tenant_id,
                LoginHistory.created_at >= thirty_days_ago,
            )
            .scalar() or 0
        )
    except Exception:
        from models.user import User as UserModel
        active_users = (
            db.query(func.count(UserModel.id))
            .filter(UserModel.tenant_id == tenant_id, UserModel.is_active.is_(True))
            .scalar() or 0
        )

    # Projects by status
    project_rows = (
        db.query(Project.status, func.count(Project.id).label("count"))
        .filter(Project.tenant_id == tenant_id)
        .group_by(Project.status)
        .all()
    )
    projects_by_status = {r.status: r.count for r in project_rows}
    total_projects = sum(projects_by_status.values())

    # Photos uploaded this month
    photos_this_month = (
        db.query(func.count(Photo.id))
        .filter(Photo.project_id.in_(
            db.query(Project.id).filter(Project.tenant_id == tenant_id)
        ))
        .filter(Photo.created_at >= month_start)
        .scalar() or 0
    )

    # Documents (submissions) generated this month
    docs_this_month = (
        db.query(func.count(Submission.id))
        .filter(Submission.project_id.in_(
            db.query(Project.id).filter(Project.tenant_id == tenant_id)
        ))
        .filter(Submission.created_at >= month_start)
        .scalar() or 0
    )

    # Storage usage estimate (G59): sum of photo file sizes
    total_photo_files = (
        db.query(func.count(Photo.id), func.sum(Photo.file_size))
        .filter(Photo.project_id.in_(
            db.query(Project.id).filter(Project.tenant_id == tenant_id)
        ))
        .first()
    )
    total_file_count = int(total_photo_files[0] or 0)
    total_storage_bytes = int(total_photo_files[1] or 0)
    total_storage_mb = round(total_storage_bytes / (1024 * 1024), 2)

    return {
        "tenant_id": tenant_id,
        "period": {
            "month": month_start.strftime("%Y-%m"),
            "generated_at": now.isoformat(),
        },
        "users": {
            "active_last_30_days": active_users,
        },
        "projects": {
            "total": total_projects,
            "by_status": projects_by_status,
        },
        "photos": {
            "uploaded_this_month": photos_this_month,
            "total_files": total_file_count,
            "estimated_storage_mb": total_storage_mb,
            "estimated_storage_bytes": total_storage_bytes,
        },
        "documents": {
            "generated_this_month": docs_this_month,
        },
        "storage": {
            "total_files": total_file_count,
            "estimated_mb": total_storage_mb,
            "estimated_bytes": total_storage_bytes,
        },
    }
