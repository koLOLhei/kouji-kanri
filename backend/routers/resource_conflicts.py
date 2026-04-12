"""Resource conflict detection endpoints."""

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.resource_conflict import (
    get_all_conflicts,
    get_conflicts_for_range,
    get_worker_monthly_conflicts,
)

router = APIRouter(tags=["resource-conflicts"])


# ---------- Project-scoped endpoints ----------

@router.get("/api/projects/{project_id}/resource-conflicts")
def get_project_conflicts_for_date(
    project_id: str,
    date: date = Query(..., description="チェック対象日 (YYYY-MM-DD)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Check all resource conflicts (workers + equipment) for a project on a date."""
    verify_project_access(project_id, user, db)
    return get_all_conflicts(project_id, date, db)


@router.get("/api/projects/{project_id}/resource-conflicts/range")
def get_project_conflicts_for_range(
    project_id: str,
    start: date = Query(..., description="開始日 (YYYY-MM-DD)"),
    end: date = Query(..., description="終了日 (YYYY-MM-DD)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Check all resource conflicts for a project over a date range."""
    verify_project_access(project_id, user, db)
    if (end - start).days > 365:
        raise HTTPException(status_code=400, detail="期間は1年以内にしてください")
    return get_conflicts_for_range(project_id, start, end, db)


# ---------- Worker-scoped endpoint ----------

@router.get("/api/workers/{worker_id}/conflicts")
def get_worker_conflicts(
    worker_id: str,
    month: str = Query(..., description="対象月 (YYYY-MM)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Get schedule conflicts for a worker in a given month (YYYY-MM)."""
    try:
        year_str, month_str = month.split("-")
        year = int(year_str)
        mon = int(month_str)
        if not (1 <= mon <= 12):
            raise ValueError("month out of range")
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="月の形式が正しくありません (YYYY-MM)")

    return get_worker_monthly_conflicts(worker_id, year, mon, db)
