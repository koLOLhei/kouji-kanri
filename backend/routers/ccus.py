"""CCUS (建設キャリアアップシステム) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.ccus import CcusRecord
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/ccus", tags=["ccus"])


# ---------- Schemas ----------

class CcusRecordCreate(BaseModel):
    worker_id: str
    ccus_id: str
    work_date: date
    check_in_time: str | None = None   # "HH:MM:SS"
    check_out_time: str | None = None  # "HH:MM:SS"
    verified: bool = False


class CcusRecordUpdate(BaseModel):
    ccus_id: str | None = None
    work_date: date | None = None
    check_in_time: str | None = None
    check_out_time: str | None = None
    verified: bool | None = None


# ---------- Endpoints ----------

@router.get("")
def list_ccus_records(
    project_id: str,
    worker_id: str | None = None,
    work_date: date | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(CcusRecord).filter(
        CcusRecord.project_id == project_id,
        CcusRecord.tenant_id == user.tenant_id,
    )
    if worker_id:
        q = q.filter(CcusRecord.worker_id == worker_id)
    if work_date:
        q = q.filter(CcusRecord.work_date == work_date)
    return q.order_by(CcusRecord.work_date.desc()).offset(offset).limit(limit).all()


@router.post("")
def create_ccus_record(
    project_id: str,
    req: CcusRecordCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = CcusRecord(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}")
def get_ccus_record(
    project_id: str,
    record_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(CcusRecord).filter(
        CcusRecord.id == record_id,
        CcusRecord.project_id == project_id,
        CcusRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="CCUS記録が見つかりません")
    return record


@router.put("/{record_id}")
def update_ccus_record(
    project_id: str,
    record_id: str,
    req: CcusRecordUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(CcusRecord).filter(
        CcusRecord.id == record_id,
        CcusRecord.project_id == project_id,
        CcusRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="CCUS記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}")
def delete_ccus_record(
    project_id: str,
    record_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(CcusRecord).filter(
        CcusRecord.id == record_id,
        CcusRecord.project_id == project_id,
        CcusRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="CCUS記録が見つかりません")
    db.delete(record)
    db.commit()
    return {"status": "ok"}
