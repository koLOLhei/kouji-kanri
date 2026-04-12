"""Neighborhood relations (近隣対策記録) router."""

from datetime import date as DateType
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.neighborhood import NeighborhoodRecord
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/neighborhood", tags=["neighborhood"])


# ---------- Schemas ----------

class NeighborhoodRecordCreate(BaseModel):
    record_type: str  # greeting, complaint, response, notice
    record_date: DateType
    neighbor_name: Optional[str] = None
    neighbor_address: Optional[str] = None
    description: str
    response_action: Optional[str] = None
    handled_by: str
    status: str = "open"


class NeighborhoodRecordUpdate(BaseModel):
    record_type: Optional[str] = None
    record_date: Optional[DateType] = None
    neighbor_name: Optional[str] = None
    neighbor_address: Optional[str] = None
    description: Optional[str] = None
    response_action: Optional[str] = None
    handled_by: Optional[str] = None
    status: Optional[str] = None


# ---------- Endpoints ----------

@router.get("")
def list_neighborhood_records(
    project_id: str,
    record_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(NeighborhoodRecord).filter(
        NeighborhoodRecord.project_id == project_id,
        NeighborhoodRecord.tenant_id == user.tenant_id,
    )
    if record_type:
        q = q.filter(NeighborhoodRecord.record_type == record_type)
    if status:
        q = q.filter(NeighborhoodRecord.status == status)
    return q.order_by(NeighborhoodRecord.date.desc()).offset(offset).limit(limit).all()


@router.post("")
def create_neighborhood_record(
    project_id: str,
    req: NeighborhoodRecordCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    data = req.model_dump()
    # map schema field → model field
    data["date"] = data.pop("record_date")
    record = NeighborhoodRecord(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **data,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}")
def get_neighborhood_record(
    project_id: str,
    record_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(NeighborhoodRecord).filter(
        NeighborhoodRecord.id == record_id,
        NeighborhoodRecord.project_id == project_id,
        NeighborhoodRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="近隣対策記録が見つかりません")
    return record


@router.put("/{record_id}")
def update_neighborhood_record(
    project_id: str,
    record_id: str,
    req: NeighborhoodRecordUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(NeighborhoodRecord).filter(
        NeighborhoodRecord.id == record_id,
        NeighborhoodRecord.project_id == project_id,
        NeighborhoodRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="近隣対策記録が見つかりません")
    data = req.model_dump(exclude_unset=True)
    if "record_date" in data:
        data["date"] = data.pop("record_date")
    for k, v in data.items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}")
def delete_neighborhood_record(
    project_id: str,
    record_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(NeighborhoodRecord).filter(
        NeighborhoodRecord.id == record_id,
        NeighborhoodRecord.project_id == project_id,
        NeighborhoodRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="近隣対策記録が見つかりません")
    db.delete(record)
    db.commit()
    return {"status": "ok"}
