"""官公庁届出 (GovernmentFiling) + 環境記録 (EnvironmentRecord) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import GovernmentFiling, EnvironmentRecord
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}", tags=["government-filings", "environment"])


# ---------- Schemas ----------

class FilingCreate(BaseModel):
    filing_type: str
    title: str
    authority: str | None = None
    due_date: date | None = None
    filed_date: date | None = None
    approval_date: date | None = None
    permit_number: str | None = None
    status: str = "pending"
    notes: str | None = None


class FilingUpdate(BaseModel):
    filing_type: str | None = None
    title: str | None = None
    authority: str | None = None
    due_date: date | None = None
    filed_date: date | None = None
    approval_date: date | None = None
    permit_number: str | None = None
    status: str | None = None
    notes: str | None = None


class EnvironmentRecordCreate(BaseModel):
    record_type: str
    record_date: date
    record_time: str | None = None
    location: str | None = None
    measured_value: float | None = None
    unit: str | None = None
    limit_value: float | None = None
    notes: str | None = None


# ---------- Filing Checklist (static) ----------

FILING_CHECKLIST = [
    {"type": "building_confirmation", "name": "確認申請", "timing": "着工前", "authority": "指定確認検査機関"},
    {"type": "road_use", "name": "道路使用許可", "timing": "着工前", "authority": "所轄警察署"},
    {"type": "recycling", "name": "建設リサイクル法届出", "timing": "着工7日前", "authority": "都道府県知事"},
    {"type": "noise", "name": "騒音規制法届出", "timing": "着工7日前", "authority": "市区町村長"},
    {"type": "crane", "name": "クレーン設置届", "timing": "設置30日前", "authority": "労働基準監督署"},
    {"type": "scaffolding", "name": "足場設置届", "timing": "設置30日前", "authority": "労働基準監督署"},
    {"type": "asbestos", "name": "石綿事前調査結果報告", "timing": "着工前", "authority": "都道府県知事"},
]


# ---------- Filing Endpoints ----------

@router.get("/filings")
def list_filings(
    project_id: str,
    status: str | None = None,
    filing_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(GovernmentFiling).filter(GovernmentFiling.project_id == project_id)
    if status:
        q = q.filter(GovernmentFiling.status == status)
    if filing_type:
        q = q.filter(GovernmentFiling.filing_type == filing_type)
    return q.order_by(GovernmentFiling.due_date.asc()).all()


@router.post("/filings", status_code=201)
def create_filing(
    project_id: str,
    body: FilingCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = GovernmentFiling(
        project_id=project_id,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/filings/{filing_id}")
def update_filing(
    project_id: str,
    filing_id: str,
    body: FilingUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(GovernmentFiling).filter(
        GovernmentFiling.id == filing_id,
        GovernmentFiling.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="届出が見つかりません")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.get("/filings/checklist")
def filing_checklist(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return FILING_CHECKLIST


# ---------- Environment Endpoints ----------

@router.get("/environment")
def list_environment_records(
    project_id: str,
    record_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(EnvironmentRecord).filter(EnvironmentRecord.project_id == project_id)
    if record_type:
        q = q.filter(EnvironmentRecord.record_type == record_type)
    if date_from:
        q = q.filter(EnvironmentRecord.record_date >= date_from)
    if date_to:
        q = q.filter(EnvironmentRecord.record_date <= date_to)
    return q.order_by(EnvironmentRecord.record_date.desc()).all()


@router.post("/environment", status_code=201)
def create_environment_record(
    project_id: str,
    body: EnvironmentRecordCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    data = body.model_dump()
    # Auto-set is_over_limit
    measured = data.get("measured_value")
    limit_val = data.get("limit_value")
    is_over = False
    if measured is not None and limit_val is not None:
        is_over = measured > limit_val
    record = EnvironmentRecord(
        project_id=project_id,
        is_over_limit=is_over,
        **data,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/environment/alerts")
def environment_alerts(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(EnvironmentRecord).filter(
        EnvironmentRecord.project_id == project_id,
        EnvironmentRecord.is_over_limit == True,
    ).order_by(EnvironmentRecord.record_date.desc()).all()
