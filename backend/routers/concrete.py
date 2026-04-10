"""コンクリート打設・養生管理 router."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.concrete_curing import ConcretePlacement
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/concrete", tags=["concrete"])


# ---------- Schemas ----------

class ConcretePlacementCreate(BaseModel):
    placement_date: date
    location: str
    member_type: str
    volume_m3: float | None = None
    design_strength: str | None = None
    slump: float | None = None
    air_content: float | None = None
    chloride: float | None = None
    concrete_temp: float | None = None
    ambient_temp: float | None = None
    curing_method: str | None = None
    curing_days_required: int = 5
    formwork_removal_days: int = 28
    weather: str | None = None
    notes: str | None = None


class ConcretePlacementUpdate(BaseModel):
    test_7day_strength: float | None = None
    test_28day_strength: float | None = None
    curing_actual_end: date | None = None
    curing_completed: bool | None = None
    formwork_removed: bool | None = None
    formwork_removed_date: date | None = None
    strength_passed: bool | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_placements(
    project_id: str,
    location: str | None = None,
    member_type: str | None = None,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(ConcretePlacement).filter(ConcretePlacement.project_id == project_id)
    if location:
        q = q.filter(ConcretePlacement.location == location)
    if member_type:
        q = q.filter(ConcretePlacement.member_type == member_type)
    return q.order_by(ConcretePlacement.placement_date.desc()).all()


@router.post("")
def create_placement(
    project_id: str, req: ConcretePlacementCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    data = req.model_dump()
    # Auto-calculate dates
    pd = data["placement_date"]
    data["curing_end_target"] = pd + timedelta(days=data["curing_days_required"])
    data["formwork_removal_target"] = pd + timedelta(days=data["formwork_removal_days"])
    data["test_7day_date"] = pd + timedelta(days=7)
    data["test_28day_date"] = pd + timedelta(days=28)
    data["curing_start"] = pd

    p = ConcretePlacement(project_id=project_id, recorded_by=user.id, **data)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/alerts")
def placement_alerts(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    today = date.today()
    threshold = today + timedelta(days=3)

    placements = db.query(ConcretePlacement).filter(
        ConcretePlacement.project_id == project_id
    ).all()

    alerts = []
    for p in placements:
        # Curing not completed and target within 3 days
        if not p.curing_completed and p.curing_end_target and p.curing_end_target <= threshold:
            alerts.append({
                "id": p.id,
                "type": "curing",
                "location": p.location,
                "member_type": p.member_type,
                "target_date": p.curing_end_target.isoformat(),
                "days_until": (p.curing_end_target - today).days,
            })
        # Formwork not removed and target within 3 days
        if not p.formwork_removed and p.formwork_removal_target and p.formwork_removal_target <= threshold:
            alerts.append({
                "id": p.id,
                "type": "formwork_removal",
                "location": p.location,
                "member_type": p.member_type,
                "target_date": p.formwork_removal_target.isoformat(),
                "days_until": (p.formwork_removal_target - today).days,
            })
        # 7-day test within 3 days
        if p.test_7day_date and p.test_7day_strength is None and p.test_7day_date <= threshold:
            alerts.append({
                "id": p.id,
                "type": "test_7day",
                "location": p.location,
                "member_type": p.member_type,
                "target_date": p.test_7day_date.isoformat(),
                "days_until": (p.test_7day_date - today).days,
            })
        # 28-day test within 3 days
        if p.test_28day_date and p.test_28day_strength is None and p.test_28day_date <= threshold:
            alerts.append({
                "id": p.id,
                "type": "test_28day",
                "location": p.location,
                "member_type": p.member_type,
                "target_date": p.test_28day_date.isoformat(),
                "days_until": (p.test_28day_date - today).days,
            })

    alerts.sort(key=lambda a: a["days_until"])
    return alerts


@router.get("/dashboard")
def placement_dashboard(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    placements = db.query(ConcretePlacement).filter(
        ConcretePlacement.project_id == project_id
    ).all()

    total = len(placements)
    curing_in_progress = sum(1 for p in placements if not p.curing_completed)
    tests_pending = sum(
        1 for p in placements
        if p.test_7day_strength is None or p.test_28day_strength is None
    )

    strengths_7 = [p.test_7day_strength for p in placements if p.test_7day_strength is not None]
    strengths_28 = [p.test_28day_strength for p in placements if p.test_28day_strength is not None]

    return {
        "total_placements": total,
        "curing_in_progress": curing_in_progress,
        "strength_tests_pending": tests_pending,
        "average_7day_strength": round(sum(strengths_7) / len(strengths_7), 2) if strengths_7 else None,
        "average_28day_strength": round(sum(strengths_28) / len(strengths_28), 2) if strengths_28 else None,
    }


@router.get("/{placement_id}")
def get_placement(
    project_id: str, placement_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    p = db.query(ConcretePlacement).filter(
        ConcretePlacement.id == placement_id,
        ConcretePlacement.project_id == project_id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="打設記録が見つかりません")
    return p


@router.put("/{placement_id}")
def update_placement(
    project_id: str, placement_id: str, req: ConcretePlacementUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    p = db.query(ConcretePlacement).filter(
        ConcretePlacement.id == placement_id,
        ConcretePlacement.project_id == project_id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="打設記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p
