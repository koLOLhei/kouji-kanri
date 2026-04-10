"""法定検査管理 (確認申請・中間検査・完了検査) router."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.staffing import LegalInspection
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/legal-inspections", tags=["legal-inspections"])


# ---------- Schemas ----------

class LegalInspectionCreate(BaseModel):
    inspection_type: str
    title: str
    authority: str | None = None
    application_date: date | None = None
    certificate_number: str | None = None
    certificate_date: date | None = None
    scheduled_date: date | None = None
    actual_date: date | None = None
    result: str = "pending"
    conditions: str | None = None
    notes: str | None = None


class LegalInspectionUpdate(BaseModel):
    inspection_type: str | None = None
    title: str | None = None
    authority: str | None = None
    application_date: date | None = None
    certificate_number: str | None = None
    certificate_date: date | None = None
    scheduled_date: date | None = None
    actual_date: date | None = None
    result: str | None = None
    conditions: str | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_inspections(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(LegalInspection).filter(
        LegalInspection.project_id == project_id
    ).order_by(LegalInspection.scheduled_date).all()


@router.post("")
def create_inspection(
    project_id: str, req: LegalInspectionCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    insp = LegalInspection(project_id=project_id, **req.model_dump())
    db.add(insp)
    db.commit()
    db.refresh(insp)
    return insp


@router.get("/upcoming")
def upcoming_inspections(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """今後30日以内の未完了検査"""
    today = date.today()
    threshold = today + timedelta(days=30)

    inspections = db.query(LegalInspection).filter(
        LegalInspection.project_id == project_id,
        LegalInspection.scheduled_date != None,
        LegalInspection.scheduled_date >= today,
        LegalInspection.scheduled_date <= threshold,
        LegalInspection.result == "pending",
    ).order_by(LegalInspection.scheduled_date).all()

    return [
        {
            "id": i.id,
            "inspection_type": i.inspection_type,
            "title": i.title,
            "authority": i.authority,
            "scheduled_date": i.scheduled_date.isoformat() if i.scheduled_date else None,
            "days_until": (i.scheduled_date - today).days if i.scheduled_date else None,
        }
        for i in inspections
    ]


@router.get("/{inspection_id}")
def get_inspection(
    project_id: str, inspection_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    insp = db.query(LegalInspection).filter(
        LegalInspection.id == inspection_id,
        LegalInspection.project_id == project_id,
    ).first()
    if not insp:
        raise HTTPException(status_code=404, detail="検査が見つかりません")
    return insp


@router.put("/{inspection_id}")
def update_inspection(
    project_id: str, inspection_id: str, req: LegalInspectionUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    insp = db.query(LegalInspection).filter(
        LegalInspection.id == inspection_id,
        LegalInspection.project_id == project_id,
    ).first()
    if not insp:
        raise HTTPException(status_code=404, detail="検査が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(insp, k, v)
    db.commit()
    db.refresh(insp)
    return insp
