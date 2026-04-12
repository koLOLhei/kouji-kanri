"""建退共 (建設業退職金共済) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.retirement_mutual_aid import RetirementMutualAidRecord
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/retirement-mutual-aid", tags=["retirement-mutual-aid"])


# ---------- Schemas ----------

class RetirementMutualAidCreate(BaseModel):
    worker_id: str
    work_date: date
    days_count: int = 1
    stamp_count: int = 1
    verified_by: str | None = None
    notes: str | None = None


class RetirementMutualAidUpdate(BaseModel):
    work_date: date | None = None
    days_count: int | None = None
    stamp_count: int | None = None
    verified_by: str | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_records(
    project_id: str,
    worker_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(RetirementMutualAidRecord).filter(
        RetirementMutualAidRecord.project_id == project_id,
        RetirementMutualAidRecord.tenant_id == user.tenant_id,
    )
    if worker_id:
        q = q.filter(RetirementMutualAidRecord.worker_id == worker_id)
    return q.order_by(RetirementMutualAidRecord.work_date.desc()).offset(offset).limit(limit).all()


@router.post("")
def create_record(
    project_id: str,
    req: RetirementMutualAidCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = RetirementMutualAidRecord(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/summary")
def get_summary(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Total stamps per worker for this project."""
    verify_project_access(project_id, user, db)
    rows = (
        db.query(
            RetirementMutualAidRecord.worker_id,
            func.sum(RetirementMutualAidRecord.days_count).label("total_days"),
            func.sum(RetirementMutualAidRecord.stamp_count).label("total_stamps"),
            func.count(RetirementMutualAidRecord.id).label("record_count"),
        )
        .filter(
            RetirementMutualAidRecord.project_id == project_id,
            RetirementMutualAidRecord.tenant_id == user.tenant_id,
        )
        .group_by(RetirementMutualAidRecord.worker_id)
        .all()
    )
    return [
        {
            "worker_id": r.worker_id,
            "total_days": int(r.total_days or 0),
            "total_stamps": int(r.total_stamps or 0),
            "record_count": r.record_count,
        }
        for r in rows
    ]


@router.get("/{record_id}")
def get_record(
    project_id: str,
    record_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(RetirementMutualAidRecord).filter(
        RetirementMutualAidRecord.id == record_id,
        RetirementMutualAidRecord.project_id == project_id,
        RetirementMutualAidRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="建退共記録が見つかりません")
    return record


@router.put("/{record_id}")
def update_record(
    project_id: str,
    record_id: str,
    req: RetirementMutualAidUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(RetirementMutualAidRecord).filter(
        RetirementMutualAidRecord.id == record_id,
        RetirementMutualAidRecord.project_id == project_id,
        RetirementMutualAidRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="建退共記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}")
def delete_record(
    project_id: str,
    record_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(RetirementMutualAidRecord).filter(
        RetirementMutualAidRecord.id == record_id,
        RetirementMutualAidRecord.project_id == project_id,
        RetirementMutualAidRecord.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="建退共記録が見つかりません")
    db.delete(record)
    db.commit()
    return {"status": "ok"}
