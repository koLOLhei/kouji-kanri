"""見積アイテム (EstimateItem) router — Section 配下の細目 CRUD + 自動再計算。"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.estimate_item import EstimateItem
from models.estimate_section import EstimateSection
from models.user import User
from services.auth_service import get_current_user
from services.estimate_calc import recalculate_estimate, recalculate_section

router = APIRouter(prefix="", tags=["estimate-items"])


# ---------- Schemas ----------

class EstimateItemCreate(BaseModel):
    name: str
    specification: str | None = None
    quantity: Decimal = Decimal("0")
    unit: str | None = None
    sale_unit_price: int = 0
    cost_unit_price: int = 0
    sort_order: int = 0
    quantity_source_id: str | None = None
    work_type_code: str | None = None
    note: str | None = None


class EstimateItemUpdate(BaseModel):
    name: str | None = None
    specification: str | None = None
    quantity: Decimal | None = None
    unit: str | None = None
    sale_unit_price: int | None = None
    cost_unit_price: int | None = None
    sort_order: int | None = None
    quantity_source_id: str | None = None
    work_type_code: str | None = None
    note: str | None = None


# ---------- Helpers ----------

def _get_section_or_404(db: Session, section_id: str, tenant_id: str) -> EstimateSection:
    section = db.query(EstimateSection).filter(
        EstimateSection.id == section_id,
        EstimateSection.tenant_id == tenant_id,
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="見積セクションが見つかりません")
    return section


def _get_item_or_404(db: Session, item_id: str, tenant_id: str) -> EstimateItem:
    item = db.query(EstimateItem).filter(
        EstimateItem.id == item_id,
        EstimateItem.tenant_id == tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="見積アイテムが見つかりません")
    return item


def _get_estimate_or_404(db: Session, estimate_id: str, tenant_id: str) -> Estimate:
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.tenant_id == tenant_id,
    ).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    return estimate


def _recalc_chain(db: Session, section: EstimateSection, tenant_id: str) -> None:
    """Section と親 Estimate を順に再集計する。db.commit() は呼ばない。"""
    recalculate_section(db, section)
    estimate = _get_estimate_or_404(db, section.estimate_id, tenant_id)
    recalculate_estimate(db, estimate)


# ---------- Endpoints ----------

@router.post("/api/estimate-sections/{section_id}/items", status_code=201)
def create_estimate_item(
    section_id: str,
    body: EstimateItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """セクション配下に細目 (Item) を新規作成し、セクション・見積を再集計する。"""
    section = _get_section_or_404(db, section_id, user.tenant_id)

    item = EstimateItem(
        tenant_id=user.tenant_id,
        section_id=section.id,
        **body.model_dump(),
    )
    db.add(item)
    db.flush()

    _recalc_chain(db, section, user.tenant_id)

    db.commit()
    db.refresh(item)
    return item


@router.put("/api/estimate-items/{item_id}")
def update_estimate_item(
    item_id: str,
    body: EstimateItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """細目 (Item) を更新し、セクション・見積を再集計する。"""
    item = _get_item_or_404(db, item_id, user.tenant_id)

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    db.flush()

    section = _get_section_or_404(db, item.section_id, user.tenant_id)
    _recalc_chain(db, section, user.tenant_id)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/api/estimate-items/{item_id}")
def delete_estimate_item(
    item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """細目 (Item) を削除し、セクション・見積を再集計する。"""
    item = _get_item_or_404(db, item_id, user.tenant_id)
    section_id = item.section_id

    db.delete(item)
    db.flush()

    section = _get_section_or_404(db, section_id, user.tenant_id)
    _recalc_chain(db, section, user.tenant_id)

    db.commit()
    return {"ok": True, "deleted_id": item_id}
