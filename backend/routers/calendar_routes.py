"""Calendar (カレンダー) router - aggregates events + Milestone CRUD."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.daily_report import DailyReport
from models.inspection import Inspection
from models.milestone import Milestone
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/calendar", tags=["calendar"])


# ---------- Schemas ----------

class MilestoneCreate(BaseModel):
    title: str
    milestone_type: str
    due_date: date
    assigned_to: str | None = None
    notes: str | None = None


class MilestoneUpdate(BaseModel):
    title: str | None = None
    milestone_type: str | None = None
    due_date: date | None = None
    completed_date: date | None = None
    status: str | None = None
    assigned_to: str | None = None
    notes: str | None = None


# ---------- Calendar aggregation ----------

@router.get("")
def get_calendar(
    project_id: str,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    events = []

    # Daily reports
    verify_project_access(project_id, user, db)
    rq = db.query(DailyReport).filter(DailyReport.project_id == project_id)
    if date_from:
        rq = rq.filter(DailyReport.report_date >= date_from)
    if date_to:
        rq = rq.filter(DailyReport.report_date <= date_to)
    for r in rq.all():
        events.append({
            "type": "daily_report",
            "id": r.id,
            "date": r.report_date.isoformat(),
            "title": f"日報 ({r.status})",
            "status": r.status,
        })

    # Inspections
    iq = db.query(Inspection).filter(Inspection.project_id == project_id)
    if date_from:
        iq = iq.filter(Inspection.scheduled_date >= date_from)
    if date_to:
        iq = iq.filter(Inspection.scheduled_date <= date_to)
    for i in iq.all():
        events.append({
            "type": "inspection",
            "id": i.id,
            "date": (i.actual_date or i.scheduled_date).isoformat() if (i.actual_date or i.scheduled_date) else None,
            "title": i.title,
            "status": i.status,
        })

    # Milestones
    mq = db.query(Milestone).filter(Milestone.project_id == project_id)
    if date_from:
        mq = mq.filter(Milestone.due_date >= date_from)
    if date_to:
        mq = mq.filter(Milestone.due_date <= date_to)
    for m in mq.all():
        events.append({
            "type": "milestone",
            "id": m.id,
            "date": m.due_date.isoformat(),
            "title": m.title,
            "status": m.status,
        })

    events.sort(key=lambda e: e.get("date") or "")
    return events


# ---------- Milestones CRUD ----------

@router.get("/milestones")
def list_milestones(
    project_id: str,
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(Milestone).filter(Milestone.project_id == project_id)
    if status:
        q = q.filter(Milestone.status == status)
    return q.order_by(Milestone.due_date).all()


@router.post("/milestones")
def create_milestone(
    project_id: str,
    req: MilestoneCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ms = Milestone(project_id=project_id, **req.model_dump())
    db.add(ms)
    db.commit()
    db.refresh(ms)
    return ms


@router.get("/milestones/{milestone_id}")
def get_milestone(
    project_id: str, milestone_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ms = db.query(Milestone).filter(
        Milestone.id == milestone_id, Milestone.project_id == project_id
    ).first()
    if not ms:
        raise HTTPException(status_code=404, detail="マイルストーンが見つかりません")
    return ms


@router.put("/milestones/{milestone_id}")
def update_milestone(
    project_id: str, milestone_id: str, req: MilestoneUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ms = db.query(Milestone).filter(
        Milestone.id == milestone_id, Milestone.project_id == project_id
    ).first()
    if not ms:
        raise HTTPException(status_code=404, detail="マイルストーンが見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(ms, k, v)
    db.commit()
    db.refresh(ms)
    return ms


@router.delete("/milestones/{milestone_id}")
def delete_milestone(
    project_id: str, milestone_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ms = db.query(Milestone).filter(
        Milestone.id == milestone_id, Milestone.project_id == project_id
    ).first()
    if not ms:
        raise HTTPException(status_code=404, detail="マイルストーンが見つかりません")
    db.delete(ms)
    db.commit()
    return {"status": "ok"}
