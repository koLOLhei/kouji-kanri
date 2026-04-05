"""Schedule router - Gantt chart and critical path endpoints."""

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.phase import Phase
from models.user import User
from schemas.phase import PhaseScheduleUpdate, PhaseResponse
from services.auth_service import get_current_user
from services.schedule_service import calculate_critical_path, get_gantt_data, auto_schedule

router = APIRouter(prefix="/api/projects/{project_id}/schedule", tags=["schedule"])


def _verify_project(project_id: str, user: User, db: Session) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")
    return project


@router.get("/gantt")
def get_gantt(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Get all data needed for Gantt chart rendering."""
    _verify_project(project_id, user, db)
    return get_gantt_data(project_id, db)


@router.get("/critical-path")
def get_critical_path(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Calculate critical path for the project."""
    _verify_project(project_id, user, db)
    phases = (
        db.query(Phase)
        .filter(Phase.project_id == project_id)
        .order_by(Phase.sort_order)
        .all()
    )
    return calculate_critical_path(phases)


@router.put("/phases/{phase_id}")
def update_phase_schedule(
    project_id: str,
    phase_id: str,
    req: PhaseScheduleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PhaseResponse:
    """Update phase schedule dates, dependencies, and progress."""
    _verify_project(project_id, user, db)
    phase = db.query(Phase).filter(
        Phase.id == phase_id,
        Phase.project_id == project_id,
    ).first()
    if not phase:
        raise HTTPException(status_code=404, detail="工程が見つかりません")

    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(phase, key, value)

    db.commit()
    db.refresh(phase)
    return PhaseResponse.model_validate(phase)


class AutoScheduleRequest(BaseModel):
    project_start: date


@router.post("/auto-schedule")
def auto_schedule_project(
    project_id: str,
    req: AutoScheduleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Auto-calculate planned_start/planned_end for all phases based on
    dependencies and duration_days. Phases without duration_days default to 7 days.
    """
    _verify_project(project_id, user, db)
    phases = (
        db.query(Phase)
        .filter(Phase.project_id == project_id)
        .order_by(Phase.sort_order)
        .all()
    )

    updates = auto_schedule(phases, req.project_start)

    # Apply to DB
    phase_map = {p.id: p for p in phases}
    for u in updates:
        p = phase_map.get(u["id"])
        if p:
            p.planned_start = date.fromisoformat(u["planned_start"])
            p.planned_end = date.fromisoformat(u["planned_end"])

    db.commit()
    return {"status": "ok", "updated": len(updates), "phases": updates}
