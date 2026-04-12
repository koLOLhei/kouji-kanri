"""Inspection (検査) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from services.timezone_utils import today_jst

from database import get_db
from models.inspection import Inspection, InspectionChecklist
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/inspections", tags=["inspections"])


# ---------- Schemas ----------

class ChecklistItemCreate(BaseModel):
    category: str | None = None
    item_name: str
    standard: str | None = None
    sort_order: int = 0


class InspectionCreate(BaseModel):
    phase_id: str | None = None
    inspection_type: str
    title: str
    scheduled_date: date | None = None
    inspector_name: str | None = None
    inspector_organization: str | None = None
    remarks: str | None = None
    checklist_items: list[ChecklistItemCreate] = []


class InspectionUpdate(BaseModel):
    title: str | None = None
    scheduled_date: date | None = None
    actual_date: date | None = None
    inspector_name: str | None = None
    inspector_organization: str | None = None
    result: str | None = None
    remarks: str | None = None
    status: str | None = None
    photo_ids: list | None = None


class InspectionComplete(BaseModel):
    actual_date: date | None = None  # Defaults to today_jst() if not provided


class ChecklistItemUpdate(BaseModel):
    result: str | None = None
    measured_value: str | None = None
    comment: str | None = None


# ---------- Inspections ----------

@router.get("")
def list_inspections(
    project_id: str,
    status: str | None = None,
    inspection_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(Inspection).filter(Inspection.project_id == project_id)
    if status:
        q = q.filter(Inspection.status == status)
    if inspection_type:
        q = q.filter(Inspection.inspection_type == inspection_type)
    return q.order_by(Inspection.scheduled_date.desc()).all()


@router.post("")
def create_inspection(
    project_id: str,
    req: InspectionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    checklist_data = req.checklist_items
    insp = Inspection(
        project_id=project_id,
        created_by=user.id,
        **req.model_dump(exclude={"checklist_items"}),
    )
    db.add(insp)
    db.flush()
    for item in checklist_data:
        db.add(InspectionChecklist(inspection_id=insp.id, **item.model_dump()))
    db.commit()
    db.refresh(insp)
    return insp


@router.get("/{inspection_id}")
def get_inspection(
    project_id: str, inspection_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    insp = db.query(Inspection).filter(
        Inspection.id == inspection_id, Inspection.project_id == project_id
    ).first()
    if not insp:
        raise HTTPException(status_code=404, detail="検査が見つかりません")
    items = db.query(InspectionChecklist).filter(
        InspectionChecklist.inspection_id == inspection_id
    ).order_by(InspectionChecklist.sort_order).all()
    return {"inspection": insp, "checklist": items}


@router.put("/{inspection_id}")
def update_inspection(
    project_id: str, inspection_id: str, req: InspectionUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    insp = db.query(Inspection).filter(
        Inspection.id == inspection_id, Inspection.project_id == project_id
    ).first()
    if not insp:
        raise HTTPException(status_code=404, detail="検査が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(insp, k, v)
    db.commit()
    db.refresh(insp)
    return insp


@router.delete("/{inspection_id}")
def delete_inspection(
    project_id: str, inspection_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    insp = db.query(Inspection).filter(
        Inspection.id == inspection_id, Inspection.project_id == project_id
    ).first()
    if not insp:
        raise HTTPException(status_code=404, detail="検査が見つかりません")
    db.query(InspectionChecklist).filter(InspectionChecklist.inspection_id == inspection_id).delete()
    db.delete(insp)
    db.commit()
    return {"status": "ok"}


@router.put("/{inspection_id}/checklist/{item_id}")
def update_checklist_item(
    project_id: str, inspection_id: str, item_id: str,
    req: ChecklistItemUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    item = db.query(InspectionChecklist).filter(
        InspectionChecklist.id == item_id, InspectionChecklist.inspection_id == inspection_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="チェック項目が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{inspection_id}/complete")
def complete_inspection(
    project_id: str, inspection_id: str,
    req: InspectionComplete | None = None,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """Mark inspection as completed, checking all checklist items.

    Accepts an optional body with `actual_date`; defaults to today (JST) if not provided.
    """
    insp = db.query(Inspection).filter(
        Inspection.id == inspection_id, Inspection.project_id == project_id
    ).first()
    if not insp:
        raise HTTPException(status_code=404, detail="検査が見つかりません")
    items = db.query(InspectionChecklist).filter(
        InspectionChecklist.inspection_id == inspection_id
    ).all()
    pending = [i for i in items if i.result == "pending"]
    if pending:
        raise HTTPException(status_code=400, detail=f"未完了のチェック項目が{len(pending)}件あります")
    failed = [i for i in items if i.result == "fail"]
    insp.status = "completed"
    insp.result = "fail" if failed else "pass"
    # Use caller-supplied date if provided, otherwise default to today (JST)
    if req and req.actual_date is not None:
        insp.actual_date = req.actual_date
    else:
        insp.actual_date = today_jst()
    db.commit()
    db.refresh(insp)
    return insp
