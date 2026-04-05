"""Meeting (打合せ) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.meeting import Meeting
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/meetings", tags=["meetings"])


# ---------- Schemas ----------

class MeetingCreate(BaseModel):
    meeting_date: date
    meeting_type: str  # regular / safety / client / internal / inspection
    title: str
    location: str | None = None
    attendees: list | None = None
    agenda: str | None = None
    minutes: str | None = None
    decisions: list | None = None
    action_items: list | None = None
    next_meeting_date: date | None = None


class MeetingUpdate(BaseModel):
    meeting_date: date | None = None
    meeting_type: str | None = None
    title: str | None = None
    location: str | None = None
    attendees: list | None = None
    agenda: str | None = None
    minutes: str | None = None
    decisions: list | None = None
    action_items: list | None = None
    next_meeting_date: date | None = None


# ---------- Endpoints ----------

@router.get("")
def list_meetings(
    project_id: str,
    meeting_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Meeting).filter(Meeting.project_id == project_id)
    if meeting_type:
        q = q.filter(Meeting.meeting_type == meeting_type)
    return q.order_by(Meeting.meeting_date.desc()).all()


@router.post("")
def create_meeting(
    project_id: str,
    req: MeetingCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = Meeting(
        project_id=project_id,
        created_by=user.id,
        **req.model_dump(),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/{meeting_id}")
def get_meeting(
    project_id: str,
    meeting_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.project_id == project_id
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="打合せが見つかりません")
    return meeting


@router.put("/{meeting_id}")
def update_meeting(
    project_id: str,
    meeting_id: str,
    req: MeetingUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.project_id == project_id
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="打合せが見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(meeting, k, v)
    db.commit()
    db.refresh(meeting)
    return meeting
