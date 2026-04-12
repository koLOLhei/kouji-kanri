"""Temporary works plan (仮設計画) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.temporary_works import TemporaryWork
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/temporary-works", tags=["temporary-works"])

WORK_TYPES = [
    "scaffold",        # 足場
    "hoarding",        # 仮囲い
    "crane",           # 揚重
    "temporary_power", # 仮設電気
    "temporary_water", # 仮設給水
    "safety_net",      # 防護ネット
]

WORK_TYPE_LABELS = {
    "scaffold": "足場",
    "hoarding": "仮囲い",
    "crane": "揚重",
    "temporary_power": "仮設電気",
    "temporary_water": "仮設給水",
    "safety_net": "防護ネット",
}


# ---------- Schemas ----------

class TemporaryWorkCreate(BaseModel):
    work_type: str
    title: str
    description: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    actual_start: date | None = None
    actual_end: date | None = None
    status: str = "planned"
    inspector: str | None = None
    inspection_date: date | None = None
    notes: str | None = None


class TemporaryWorkUpdate(BaseModel):
    work_type: str | None = None
    title: str | None = None
    description: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    actual_start: date | None = None
    actual_end: date | None = None
    status: str | None = None
    inspector: str | None = None
    inspection_date: date | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_temporary_works(
    project_id: str,
    work_type: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(TemporaryWork).filter(
        TemporaryWork.project_id == project_id,
        TemporaryWork.tenant_id == user.tenant_id,
    )
    if work_type:
        q = q.filter(TemporaryWork.work_type == work_type)
    if status:
        q = q.filter(TemporaryWork.status == status)
    return q.order_by(TemporaryWork.planned_start.asc().nulls_last()).offset(offset).limit(limit).all()


@router.post("")
def create_temporary_work(
    project_id: str,
    req: TemporaryWorkCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    if req.work_type not in WORK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid work_type. Valid values: {WORK_TYPES}")
    work = TemporaryWork(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(work)
    db.commit()
    db.refresh(work)
    return work


@router.get("/work-types")
def list_work_types():
    return [{"value": k, "label": v} for k, v in WORK_TYPE_LABELS.items()]


@router.get("/{work_id}")
def get_temporary_work(
    project_id: str,
    work_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    work = db.query(TemporaryWork).filter(
        TemporaryWork.id == work_id,
        TemporaryWork.project_id == project_id,
        TemporaryWork.tenant_id == user.tenant_id,
    ).first()
    if not work:
        raise HTTPException(status_code=404, detail="仮設工事計画が見つかりません")
    return work


@router.put("/{work_id}")
def update_temporary_work(
    project_id: str,
    work_id: str,
    req: TemporaryWorkUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    work = db.query(TemporaryWork).filter(
        TemporaryWork.id == work_id,
        TemporaryWork.project_id == project_id,
        TemporaryWork.tenant_id == user.tenant_id,
    ).first()
    if not work:
        raise HTTPException(status_code=404, detail="仮設工事計画が見つかりません")
    data = req.model_dump(exclude_unset=True)
    if "work_type" in data and data["work_type"] not in WORK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid work_type. Valid values: {WORK_TYPES}")
    for k, v in data.items():
        setattr(work, k, v)
    db.commit()
    db.refresh(work)
    return work


@router.delete("/{work_id}")
def delete_temporary_work(
    project_id: str,
    work_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    work = db.query(TemporaryWork).filter(
        TemporaryWork.id == work_id,
        TemporaryWork.project_id == project_id,
        TemporaryWork.tenant_id == user.tenant_id,
    ).first()
    if not work:
        raise HTTPException(status_code=404, detail="仮設工事計画が見つかりません")
    db.delete(work)
    db.commit()
    return {"status": "ok"}
