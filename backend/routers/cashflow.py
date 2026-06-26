"""資金繰り予測 — 未回収請求(入金予定) − 未払の支払通知(支払予定) の月次CF投影。

入金予定: 売掛残高(請求総額 − 入金済) を支払期限の月に計上（期限超過は当月）。
支払予定: 未払の支払通知(PaymentNotice) を支払日の月に計上（超過は当月）。
※ 期首現金残は保持していないため、cumulative は「予測期間の累積CF」を表す。
"""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Invoice, PaymentNotice
from models.payment_receipt import PaymentReceipt
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/cashflow", tags=["cashflow"])

_BILLABLE_KINDS = ("progress", "deposit", "additional", "final", "manual")


def _ym(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _months_ahead(n: int) -> list[str]:
    today = date.today()
    y, m = today.year, today.month
    out = []
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


@router.get("/forecast")
def forecast(
    months: int = 6,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    months = max(1, min(months, 24))
    period = _months_ahead(months)
    period_set = set(period)
    first = period[0]
    today = date.today()

    # ── 入金予定（売掛残高） ──
    invoices = (
        db.query(Invoice)
        .filter(Invoice.tenant_id == user.tenant_id, Invoice.kind.in_(_BILLABLE_KINDS))
        .all()
    )
    paid_rows = (
        db.query(PaymentReceipt.invoice_id, func.coalesce(func.sum(PaymentReceipt.amount), 0))
        .filter(PaymentReceipt.tenant_id == user.tenant_id, PaymentReceipt.invoice_id.isnot(None))
        .group_by(PaymentReceipt.invoice_id)
        .all()
    )
    paid_map = {i: int(t) for i, t in paid_rows}
    inflow = {k: 0 for k in period}
    for inv in invoices:
        bal = int(inv.total or 0) - paid_map.get(inv.id, 0)
        if bal <= 0:
            continue
        if inv.due_date:
            key = first if inv.due_date < today else _ym(inv.due_date)
        else:
            key = first
        if key not in period_set:
            key = period[-1]  # 期間外の将来は最終月に寄せ、合計を欠落させない
        inflow[key] += bal

    # ── 支払予定（未払の支払通知） ──
    notices = (
        db.query(PaymentNotice)
        .filter(PaymentNotice.tenant_id == user.tenant_id, PaymentNotice.status != "paid")
        .all()
    )
    outflow = {k: 0 for k in period}
    for n in notices:
        amt = int(n.total or 0)
        if amt <= 0:
            continue
        if n.payment_date:
            key = first if n.payment_date < today else _ym(n.payment_date)
        else:
            key = first
        if key not in period_set:
            key = period[-1]
        outflow[key] += amt

    rows = []
    running = 0
    for k in period:
        net = inflow[k] - outflow[k]
        running += net
        rows.append({
            "month": k,
            "inflow": inflow[k],
            "outflow": outflow[k],
            "net": net,
            "cumulative": running,
        })
    return {
        "months": months,
        "rows": rows,
        "total_inflow": sum(inflow.values()),
        "total_outflow": sum(outflow.values()),
        "net": sum(inflow.values()) - sum(outflow.values()),
    }
