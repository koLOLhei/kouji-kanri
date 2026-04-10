"""利用データ分析（テレメトリ） router."""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from database import get_db
from models.instruction import UsageTelemetry
from models.user import User
from services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


# ---------- Schemas ----------

class TelemetryTrack(BaseModel):
    event_type: str
    event_data: dict | None = None
    page_path: str | None = None
    device_type: str | None = None


# ---------- Endpoints ----------

@router.post("/track", status_code=201)
def track_event(
    body: TelemetryTrack,
    db: Session = Depends(get_db),
):
    """No auth required for tracking."""
    record = UsageTelemetry(
        tenant_id="anonymous",
        user_id="anonymous",
        event_type=body.event_type,
        event_data=body.event_data,
        page_path=body.page_path,
        device_type=body.device_type,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "status": "tracked"}


@router.get("/stats")
def telemetry_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Admin only. Returns aggregated telemetry stats."""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # Events by type
    events_by_type = (
        db.query(UsageTelemetry.event_type, func.count(UsageTelemetry.id))
        .group_by(UsageTelemetry.event_type)
        .all()
    )

    # Events by day (last 30 days)
    events_by_day = (
        db.query(
            cast(UsageTelemetry.created_at, Date).label("day"),
            func.count(UsageTelemetry.id),
        )
        .filter(UsageTelemetry.created_at >= thirty_days_ago)
        .group_by("day")
        .order_by("day")
        .all()
    )

    # Active users (distinct user_id in last 30 days, excluding anonymous)
    active_users = (
        db.query(func.count(func.distinct(UsageTelemetry.user_id)))
        .filter(
            UsageTelemetry.created_at >= thirty_days_ago,
            UsageTelemetry.user_id != "anonymous",
        )
        .scalar()
    ) or 0

    # Most used features (top event_types by count, last 30 days)
    most_used = (
        db.query(UsageTelemetry.event_type, func.count(UsageTelemetry.id).label("count"))
        .filter(UsageTelemetry.created_at >= thirty_days_ago)
        .group_by(UsageTelemetry.event_type)
        .order_by(func.count(UsageTelemetry.id).desc())
        .limit(10)
        .all()
    )

    return {
        "events_by_type": {etype: cnt for etype, cnt in events_by_type},
        "events_by_day": [{"date": str(day), "count": cnt} for day, cnt in events_by_day],
        "active_users_count": active_users,
        "most_used_features": [{"event_type": etype, "count": cnt} for etype, cnt in most_used],
    }
