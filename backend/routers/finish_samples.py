"""色見本・仕上げ見本管理 (Finish Sample) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.instruction import FinishSample
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/finish-samples", tags=["finish-samples"])


# ---------- Schemas ----------

class FinishSampleCreate(BaseModel):
    sample_type: str
    name: str
    location: str | None = None
    manufacturer: str | None = None
    product_code: str | None = None
    color_code: str | None = None
    file_key: str | None = None
    notes: str | None = None


class FinishSampleUpdate(BaseModel):
    sample_type: str | None = None
    name: str | None = None
    location: str | None = None
    manufacturer: str | None = None
    product_code: str | None = None
    color_code: str | None = None
    file_key: str | None = None
    status: str | None = None
    approved_by: str | None = None
    approved_date: date | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_finish_samples(
    project_id: str,
    sample_type: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    q = db.query(FinishSample).filter(FinishSample.project_id == project_id)
    if sample_type:
        q = q.filter(FinishSample.sample_type == sample_type)
    if status:
        q = q.filter(FinishSample.status == status)
    return q.order_by(FinishSample.created_at.desc()).all()


@router.post("", status_code=201)
def create_finish_sample(
    project_id: str,
    body: FinishSampleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = FinishSample(project_id=project_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{sample_id}")
def get_finish_sample(
    project_id: str,
    sample_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(FinishSample).filter(
        FinishSample.id == sample_id,
        FinishSample.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="見本が見つかりません")
    return record


@router.put("/{sample_id}")
def update_finish_sample(
    project_id: str,
    sample_id: str,
    body: FinishSampleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(FinishSample).filter(
        FinishSample.id == sample_id,
        FinishSample.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="見本が見つかりません")

    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    db.commit()
    db.refresh(record)
    return record
