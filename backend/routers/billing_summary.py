"""請求サマリー API (G11).

案件単位での請負金額・変更額・請求済・入金済・残額・出来高率を集計して返す。
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from database import get_db
from models.business_docs import Estimate, Invoice
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}", tags=["billing-summary"])


# ---------- Schemas ----------

class BillingSummaryResponse(BaseModel):
    contract_amount: int
    change_orders_total: int
    billed_to_date: int
    paid_to_date: int
    remaining: int
    progress_percent_amount: float


class BillingTimeseriesPoint(BaseModel):
    period_ym: str  # "YYYY-MM"
    billed: int
    paid: int


# ---------- Helpers ----------

_BILLABLE_KINDS = ("progress", "deposit", "additional", "final")


def _calc_change_orders_total(db: Session, tenant_id: str, project_id: str) -> int:
    """改訂された Estimate (parent_estimate_id を持つもの) の親との差分合計を返す.

    各改訂版について (revision.total - parent.total) を合計する。
    同じ親に対して複数の改訂が連続している場合も、各リビジョンと親(直前ではなく
    parent_estimate_id 先) との差分を素直に積み上げる。
    """
    Parent = aliased(Estimate)
    rows = (
        db.query(
            Estimate.total.label("rev_total"),
            Parent.total.label("parent_total"),
        )
        .join(Parent, Parent.id == Estimate.parent_estimate_id)
        .filter(
            Estimate.tenant_id == tenant_id,
            Estimate.project_id == project_id,
            Estimate.parent_estimate_id.isnot(None),
        )
        .all()
    )
    total = 0
    for rev_total, parent_total in rows:
        total += int((rev_total or 0) - (parent_total or 0))
    return total


# ---------- Endpoints ----------

@router.get("/billing-summary", response_model=BillingSummaryResponse)
def get_billing_summary(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """請求サマリーを返す."""
    project = verify_project_access(project_id, current_user, db)
    if project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="この案件へのアクセス権がありません")

    contract_amount = int(project.contract_amount or 0)
    change_orders_total = _calc_change_orders_total(db, current_user.tenant_id, project_id)

    billed_to_date = (
        db.query(func.coalesce(func.sum(Invoice.total), 0))
        .filter(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.project_id == project_id,
            Invoice.kind.in_(_BILLABLE_KINDS),
        )
        .scalar()
        or 0
    )
    billed_to_date = int(billed_to_date)

    paid_to_date = (
        db.query(func.coalesce(func.sum(Invoice.total), 0))
        .filter(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.project_id == project_id,
            Invoice.paid_date.isnot(None),
        )
        .scalar()
        or 0
    )
    paid_to_date = int(paid_to_date)

    base_contract = contract_amount + change_orders_total
    remaining = base_contract - billed_to_date

    if base_contract > 0:
        progress_percent_amount = round(billed_to_date / base_contract * 100.0, 2)
    else:
        progress_percent_amount = 0.0

    return BillingSummaryResponse(
        contract_amount=contract_amount,
        change_orders_total=change_orders_total,
        billed_to_date=billed_to_date,
        paid_to_date=paid_to_date,
        remaining=remaining,
        progress_percent_amount=progress_percent_amount,
    )


@router.get("/billing-summary/timeseries", response_model=list[BillingTimeseriesPoint])
def get_billing_timeseries(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """月別の請求額・入金額の時系列を返す."""
    project = verify_project_access(project_id, current_user, db)
    if project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="この案件へのアクセス権がありません")

    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.project_id == project_id,
        )
        .all()
    )

    bucket: dict[str, dict[str, int]] = {}

    def _ym(d: date | None) -> str | None:
        if d is None:
            return None
        return f"{d.year:04d}-{d.month:02d}"

    for inv in invoices:
        # 請求月: invoice_date を基準
        if inv.kind in _BILLABLE_KINDS and inv.invoice_date is not None:
            key = _ym(inv.invoice_date)
            if key is not None:
                bucket.setdefault(key, {"billed": 0, "paid": 0})
                bucket[key]["billed"] += int(inv.total or 0)
        # 入金月: paid_date を基準
        if inv.paid_date is not None:
            key = _ym(inv.paid_date)
            if key is not None:
                bucket.setdefault(key, {"billed": 0, "paid": 0})
                bucket[key]["paid"] += int(inv.total or 0)

    result = [
        BillingTimeseriesPoint(period_ym=ym, billed=vals["billed"], paid=vals["paid"])
        for ym, vals in sorted(bucket.items())
    ]
    return result
