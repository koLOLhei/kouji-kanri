"""引渡品目 (HandoverItem) + 材料トレーサビリティ (MaterialTraceability) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Integer, func
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import HandoverItem, MaterialTraceability
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}", tags=["handover", "traceability"])


# ---------- Schemas ----------

class HandoverItemCreate(BaseModel):
    item_type: str
    name: str
    quantity: int = 1
    location: str | None = None
    manufacturer: str | None = None
    warranty_until: date | None = None
    file_key: str | None = None
    notes: str | None = None


class HandoverItemUpdate(BaseModel):
    item_type: str | None = None
    name: str | None = None
    quantity: int | None = None
    location: str | None = None
    manufacturer: str | None = None
    warranty_until: date | None = None
    file_key: str | None = None
    handed_over: bool | None = None
    handed_over_date: date | None = None
    received_by: str | None = None
    notes: str | None = None


class TraceabilityCreate(BaseModel):
    material_name: str
    manufacturer: str | None = None
    lot_number: str | None = None
    delivery_date: date | None = None
    used_location: str | None = None
    used_phase_id: str | None = None
    quantity_used: float | None = None
    unit: str | None = None
    test_record_id: str | None = None
    notes: str | None = None


# ---------- HandoverItem Endpoints ----------

@router.get("/handover-items")
def list_handover_items(
    project_id: str,
    item_type: str | None = None,
    handed_over: bool | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(HandoverItem).filter(HandoverItem.project_id == project_id)
    if item_type:
        q = q.filter(HandoverItem.item_type == item_type)
    if handed_over is not None:
        q = q.filter(HandoverItem.handed_over == handed_over)
    return q.order_by(HandoverItem.created_at.desc()).all()


@router.post("/handover-items", status_code=201)
def create_handover_item(
    project_id: str,
    body: HandoverItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = HandoverItem(
        project_id=project_id,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/handover-items/{item_id}")
def update_handover_item(
    project_id: str,
    item_id: str,
    body: HandoverItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(HandoverItem).filter(
        HandoverItem.id == item_id,
        HandoverItem.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="引渡品目が見つかりません")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.get("/handover-items/summary")
def handover_summary(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    rows = db.query(
        HandoverItem.item_type,
        func.count(HandoverItem.id).label("total"),
        func.sum(func.cast(HandoverItem.handed_over, Integer)).label("handed_over_count"),
    ).filter(
        HandoverItem.project_id == project_id,
    ).group_by(HandoverItem.item_type).all()

    return [
        {
            "item_type": r.item_type,
            "total": r.total,
            "handed_over": r.handed_over_count or 0,
            "remaining": r.total - (r.handed_over_count or 0),
        }
        for r in rows
    ]


# ---------- Traceability Endpoints ----------

@router.get("/traceability")
def list_traceability(
    project_id: str,
    material_name: str | None = None,
    used_location: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(MaterialTraceability).filter(MaterialTraceability.project_id == project_id)
    if material_name:
        q = q.filter(MaterialTraceability.material_name.ilike(f"%{material_name}%"))
    if used_location:
        q = q.filter(MaterialTraceability.used_location.ilike(f"%{used_location}%"))
    return q.order_by(MaterialTraceability.created_at.desc()).all()


@router.post("/traceability", status_code=201)
def create_traceability(
    project_id: str,
    body: TraceabilityCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = MaterialTraceability(
        project_id=project_id,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/traceability/{trace_id}")
def get_traceability(
    project_id: str,
    trace_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(MaterialTraceability).filter(
        MaterialTraceability.id == trace_id,
        MaterialTraceability.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="トレーサビリティ記録が見つかりません")
    return record
