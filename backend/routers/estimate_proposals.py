"""G10 見積 提案項目 router — 本見積外で管理し、採用時に Section/Item へ取り込み。"""

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.estimate_item import EstimateItem
from models.estimate_proposal import EstimateProposal
from models.estimate_section import EstimateSection
from models.user import User
from services.auth_service import get_current_user
from services.estimate_calc import recalculate_estimate

router = APIRouter(prefix="", tags=["estimate-proposals"])


# ---------- Schemas ----------

class ProposalCreate(BaseModel):
    name: str
    specification: str | None = None
    quantity: Decimal = Decimal("0")
    unit: str | None = None
    sale_unit_price: int = 0
    cost_unit_price: int = 0
    note: str | None = None


class ProposalUpdate(BaseModel):
    name: str | None = None
    specification: str | None = None
    quantity: Decimal | None = None
    unit: str | None = None
    sale_unit_price: int | None = None
    cost_unit_price: int | None = None
    status: str | None = None
    note: str | None = None


# ---------- Helpers ----------

def _get_estimate_for_user(estimate_id: str, user: User, db: Session) -> Estimate:
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.tenant_id == user.tenant_id,
    ).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    return estimate


def _get_proposal_for_user(proposal_id: str, user: User, db: Session) -> EstimateProposal:
    proposal = db.query(EstimateProposal).filter(
        EstimateProposal.id == proposal_id,
        EstimateProposal.tenant_id == user.tenant_id,
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="提案項目が見つかりません")
    return proposal


def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _recalc_amounts(proposal: EstimateProposal) -> None:
    quantity = _to_decimal(proposal.quantity)
    sale_unit_price = int(proposal.sale_unit_price or 0)
    cost_unit_price = int(proposal.cost_unit_price or 0)
    proposal.sale_amount = int(quantity * Decimal(sale_unit_price))
    proposal.cost_amount = int(quantity * Decimal(cost_unit_price))


# ---------- Endpoints ----------

@router.get("/api/estimates/{estimate_id}/proposals")
def list_proposals(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """見積に紐づく提案項目を一覧。"""
    _get_estimate_for_user(estimate_id, user, db)
    rows = (
        db.query(EstimateProposal)
        .filter(
            EstimateProposal.estimate_id == estimate_id,
            EstimateProposal.tenant_id == user.tenant_id,
        )
        .order_by(EstimateProposal.created_at.asc())
        .all()
    )
    return rows


@router.post("/api/estimates/{estimate_id}/proposals", status_code=201)
def create_proposal(
    estimate_id: str,
    body: ProposalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """提案項目を新規作成。"""
    _get_estimate_for_user(estimate_id, user, db)

    proposal = EstimateProposal(
        tenant_id=user.tenant_id,
        estimate_id=estimate_id,
        name=body.name,
        specification=body.specification,
        quantity=body.quantity,
        unit=body.unit,
        sale_unit_price=int(body.sale_unit_price or 0),
        cost_unit_price=int(body.cost_unit_price or 0),
        status="pending",
        note=body.note,
    )
    _recalc_amounts(proposal)

    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


@router.put("/api/estimate-proposals/{pid}")
def update_proposal(
    pid: str,
    body: ProposalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """提案項目を更新。"""
    proposal = _get_proposal_for_user(pid, user, db)

    data = body.model_dump(exclude_unset=True)
    for key, val in data.items():
        setattr(proposal, key, val)

    if any(k in data for k in ("quantity", "sale_unit_price", "cost_unit_price")):
        _recalc_amounts(proposal)

    db.commit()
    db.refresh(proposal)
    return proposal


@router.delete("/api/estimate-proposals/{pid}", status_code=204)
def delete_proposal(
    pid: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """提案項目を削除。"""
    proposal = _get_proposal_for_user(pid, user, db)
    db.delete(proposal)
    db.commit()
    return None


@router.post("/api/estimate-proposals/{pid}/adopt")
def adopt_proposal(
    pid: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """提案項目を採用 — 本見積の '提案項目' Section に EstimateItem を作成し、見積全体を再計算。"""
    proposal = _get_proposal_for_user(pid, user, db)

    if proposal.status == "adopted":
        raise HTTPException(status_code=422, detail="この提案項目は既に採用済みです")

    estimate = _get_estimate_for_user(proposal.estimate_id, user, db)

    # '提案項目' Section を取得 or 新規作成
    section = (
        db.query(EstimateSection)
        .filter(
            EstimateSection.estimate_id == estimate.id,
            EstimateSection.tenant_id == user.tenant_id,
            EstimateSection.name == "提案項目",
        )
        .first()
    )
    if section is None:
        max_sort = db.query(func.max(EstimateSection.sort_order)).filter(
            EstimateSection.estimate_id == estimate.id,
        ).scalar()
        section = EstimateSection(
            tenant_id=user.tenant_id,
            estimate_id=estimate.id,
            name="提案項目",
            sort_order=(int(max_sort or 0) + 1),
            level=1,
        )
        db.add(section)
        db.flush()  # id 確保

    # EstimateItem を生成
    max_item_sort = db.query(func.max(EstimateItem.sort_order)).filter(
        EstimateItem.section_id == section.id,
    ).scalar()
    item = EstimateItem(
        tenant_id=user.tenant_id,
        section_id=section.id,
        sort_order=(int(max_item_sort or 0) + 1),
        name=proposal.name,
        specification=proposal.specification,
        quantity=_to_decimal(proposal.quantity),
        unit=proposal.unit,
        sale_unit_price=int(proposal.sale_unit_price or 0),
        cost_unit_price=int(proposal.cost_unit_price or 0),
        note=proposal.note,
    )
    db.add(item)
    db.flush()

    proposal.status = "adopted"
    proposal.adopted_at = datetime.now(timezone.utc)
    proposal.adopted_section_id = section.id

    # 見積全体を再計算
    recalculate_estimate(db, estimate)

    db.commit()
    db.refresh(proposal)
    db.refresh(estimate)
    db.refresh(item)

    return {
        "proposal": proposal,
        "section_id": section.id,
        "item_id": item.id,
        "estimate": {
            "id": estimate.id,
            "subtotal": estimate.subtotal,
            "tax_amount": estimate.tax_amount,
            "total": estimate.total,
        },
    }
