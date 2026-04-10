"""受注確度管理（営業パイプライン） router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.instruction import SalesPipeline
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/sales-pipeline", tags=["sales-pipeline"])


# ---------- Schemas ----------

class SalesPipelineCreate(BaseModel):
    project_name: str
    client_name: str | None = None
    estimated_amount: int | None = None
    probability: str
    stage: str = "prospect"
    expected_start: date | None = None
    bid_deadline: date | None = None
    assigned_to: str | None = None
    source: str | None = None
    notes: str | None = None


class SalesPipelineUpdate(BaseModel):
    project_name: str | None = None
    client_name: str | None = None
    estimated_amount: int | None = None
    probability: str | None = None
    stage: str | None = None
    expected_start: date | None = None
    bid_deadline: date | None = None
    assigned_to: str | None = None
    source: str | None = None
    notes: str | None = None
    converted_project_id: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_sales_pipeline(
    probability: str | None = None,
    stage: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(SalesPipeline).filter(SalesPipeline.tenant_id == user.tenant_id)
    if probability:
        q = q.filter(SalesPipeline.probability == probability)
    if stage:
        q = q.filter(SalesPipeline.stage == stage)
    return q.order_by(SalesPipeline.updated_at.desc()).all()


@router.post("", status_code=201)
def create_sales_pipeline(
    body: SalesPipelineCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = SalesPipeline(tenant_id=user.tenant_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/summary")
def sales_pipeline_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.query(SalesPipeline).filter(SalesPipeline.tenant_id == user.tenant_id).all()

    by_stage: dict[str, int] = {}
    by_probability: dict[str, int] = {}

    for r in rows:
        by_stage[r.stage] = by_stage.get(r.stage, 0) + 1
        amt = r.estimated_amount or 0
        by_probability[r.probability] = by_probability.get(r.probability, 0) + amt

    return {
        "total_count": len(rows),
        "counts_by_stage": by_stage,
        "total_estimated_amount_by_probability": by_probability,
    }


@router.get("/{pipeline_id}")
def get_sales_pipeline(
    pipeline_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.query(SalesPipeline).filter(
        SalesPipeline.id == pipeline_id,
        SalesPipeline.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="パイプラインが見つかりません")
    return record


@router.put("/{pipeline_id}")
def update_sales_pipeline(
    pipeline_id: str,
    body: SalesPipelineUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.query(SalesPipeline).filter(
        SalesPipeline.id == pipeline_id,
        SalesPipeline.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="パイプラインが見つかりません")

    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    db.commit()
    db.refresh(record)
    return record
