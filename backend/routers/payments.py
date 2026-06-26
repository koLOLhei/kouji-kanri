"""入金消込・売掛(AR)管理 router。

- 入金記録(PaymentReceipt)の登録/一覧/削除（案件配下）
- 入金時に請求書の残高を再計算し、全額入金なら status='paid' を自動設定
- 売掛金エイジング(AR aging)レポート（テナント横断）
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Invoice, PaymentNotice
from models.payment_receipt import PaymentReceipt
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/payments", tags=["payments"])
ar_router = APIRouter(prefix="/api/ar", tags=["accounts-receivable"])

# 売掛対象とみなす請求種別
_BILLABLE_KINDS = ("progress", "deposit", "additional", "final", "manual")


# ---------- Schemas ----------

class PaymentCreate(BaseModel):
    invoice_id: str | None = None
    amount: int
    payment_date: date | None = None
    method: str | None = None
    notes: str | None = None


# ---------- Helpers ----------

def _paid_total(db: Session, tenant_id: str, invoice_id: str) -> int:
    """その請求書への入金合計。"""
    return int(
        db.query(func.coalesce(func.sum(PaymentReceipt.amount), 0))
        .filter(PaymentReceipt.tenant_id == tenant_id, PaymentReceipt.invoice_id == invoice_id)
        .scalar()
        or 0
    )


def _reconcile_invoice(db: Session, tenant_id: str, invoice_id: str) -> None:
    """請求書の入金状況を再計算し、全額入金なら paid、未充当なら sent に戻す。"""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id).first()
    if not inv:
        return
    paid = _paid_total(db, tenant_id, invoice_id)
    total = int(inv.total or 0)
    if total > 0 and paid >= total:
        inv.status = "paid"
        if not inv.paid_date:
            last = (
                db.query(func.max(PaymentReceipt.payment_date))
                .filter(PaymentReceipt.tenant_id == tenant_id, PaymentReceipt.invoice_id == invoice_id)
                .scalar()
            )
            inv.paid_date = last or date.today()
    elif inv.status == "paid":
        # 満額に満たない（部分入金/領収取消/全入金削除）→ 未消込に戻す。
        # reconcileは入金の登録・削除時のみ呼ばれるため、入金操作の無い手動paidには影響しない。
        inv.status = "sent"
        inv.paid_date = None


def _serialize(p: PaymentReceipt) -> dict:
    return {
        "id": p.id,
        "project_id": p.project_id,
        "invoice_id": p.invoice_id,
        "amount": p.amount,
        "payment_date": p.payment_date.isoformat() if p.payment_date else None,
        "method": p.method,
        "notes": p.notes,
        "created_by": p.created_by,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


# ---------- 入金記録 (案件配下) ----------

@router.get("")
def list_payments(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    rows = (
        db.query(PaymentReceipt)
        .filter(PaymentReceipt.tenant_id == user.tenant_id, PaymentReceipt.project_id == project_id)
        .order_by(PaymentReceipt.payment_date.desc())
        .all()
    )
    return [_serialize(p) for p in rows]


@router.post("", status_code=201)
def create_payment(
    project_id: str,
    body: PaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    if body.amount is None or body.amount <= 0:
        raise HTTPException(status_code=400, detail="入金額は正の値を入力してください")
    # 充当先請求書の所属チェック
    if body.invoice_id:
        inv = (
            db.query(Invoice)
            .filter(Invoice.id == body.invoice_id, Invoice.tenant_id == user.tenant_id, Invoice.project_id == project_id)
            .first()
        )
        if not inv:
            raise HTTPException(status_code=404, detail="充当先の請求書が見つかりません")
    rec = PaymentReceipt(
        tenant_id=user.tenant_id,
        project_id=project_id,
        invoice_id=body.invoice_id,
        amount=int(body.amount),
        payment_date=body.payment_date or date.today(),
        method=body.method,
        notes=body.notes,
        created_by=user.id,
    )
    db.add(rec)
    db.flush()
    if body.invoice_id:
        _reconcile_invoice(db, user.tenant_id, body.invoice_id)
    db.commit()
    db.refresh(rec)
    return _serialize(rec)


@router.delete("/{payment_id}")
def delete_payment(
    project_id: str,
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    rec = (
        db.query(PaymentReceipt)
        .filter(
            PaymentReceipt.id == payment_id,
            PaymentReceipt.tenant_id == user.tenant_id,
            PaymentReceipt.project_id == project_id,
        )
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="入金記録が見つかりません")
    invoice_id = rec.invoice_id
    db.delete(rec)
    db.flush()
    if invoice_id:
        _reconcile_invoice(db, user.tenant_id, invoice_id)
    db.commit()
    return {"detail": "削除しました"}


# ---------- 売掛(AR)エイジング (テナント横断) ----------

def _bucket(days_overdue: int) -> str:
    if days_overdue <= 0:
        return "current"
    if days_overdue <= 30:
        return "d1_30"
    if days_overdue <= 60:
        return "d31_60"
    if days_overdue <= 90:
        return "d61_90"
    return "over90"


@ar_router.get("/aging")
def ar_aging(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """売掛金エイジング: 残高のある請求書を滞留日数で区分して返す（テナント横断）。"""
    today = date.today()
    invoices = (
        db.query(Invoice)
        .filter(Invoice.tenant_id == user.tenant_id, Invoice.kind.in_(_BILLABLE_KINDS))
        .all()
    )
    # 請求書ごとの入金合計
    paid_rows = (
        db.query(PaymentReceipt.invoice_id, func.coalesce(func.sum(PaymentReceipt.amount), 0))
        .filter(PaymentReceipt.tenant_id == user.tenant_id, PaymentReceipt.invoice_id.isnot(None))
        .group_by(PaymentReceipt.invoice_id)
        .all()
    )
    paid_map = {inv_id: int(total) for inv_id, total in paid_rows}

    buckets = {"current": 0, "d1_30": 0, "d31_60": 0, "d61_90": 0, "over90": 0}
    rows = []
    total_ar = 0
    for inv in invoices:
        total = int(inv.total or 0)
        paid = paid_map.get(inv.id, 0)
        balance = total - paid
        if balance <= 0:
            continue
        days_overdue = (today - inv.due_date).days if inv.due_date else 0
        b = _bucket(days_overdue)
        buckets[b] += balance
        total_ar += balance
        rows.append({
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "project_id": inv.project_id,
            "customer_name": inv.customer_name,
            "total": total,
            "paid": paid,
            "balance": balance,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "days_overdue": max(0, days_overdue),
            "bucket": b,
        })
    rows.sort(key=lambda r: r["days_overdue"], reverse=True)
    # 未充当入金（請求書に紐付かない前受/預り）— 純売掛から差し引く
    unallocated = int(
        db.query(func.coalesce(func.sum(PaymentReceipt.amount), 0))
        .filter(PaymentReceipt.tenant_id == user.tenant_id, PaymentReceipt.invoice_id.is_(None))
        .scalar()
        or 0
    )
    return {
        "total_ar": total_ar,
        "unallocated": unallocated,
        "net_ar": max(0, total_ar - unallocated),
        "buckets": buckets,
        "count": len(rows),
        "invoices": rows,
    }


# ---------- 買掛(AP)・支払消込 ----------

ap_router = APIRouter(prefix="/api/ap", tags=["accounts-payable"])
notice_router = APIRouter(prefix="/api/projects/{project_id}/payment-notices", tags=["payment-notices"])


class SettleNotice(BaseModel):
    paid_date: date | None = None


def _get_notice_or_404(db: Session, notice_id: str, tenant_id: str, project_id: str) -> PaymentNotice:
    n = (
        db.query(PaymentNotice)
        .filter(
            PaymentNotice.id == notice_id,
            PaymentNotice.tenant_id == tenant_id,
            PaymentNotice.project_id == project_id,
        )
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="支払通知が見つかりません")
    return n


@notice_router.post("/{notice_id}/settle")
def settle_payment_notice(
    project_id: str,
    notice_id: str,
    body: SettleNotice,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """支払通知を支払済(消込)にする。"""
    verify_project_access(project_id, user, db)
    n = _get_notice_or_404(db, notice_id, user.tenant_id, project_id)
    n.status = "paid"
    n.paid_date = body.paid_date or date.today()
    db.commit()
    return {"id": n.id, "status": n.status, "paid_date": n.paid_date.isoformat() if n.paid_date else None}


@notice_router.post("/{notice_id}/unsettle")
def unsettle_payment_notice(
    project_id: str,
    notice_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """支払消込を取り消す。"""
    verify_project_access(project_id, user, db)
    n = _get_notice_or_404(db, notice_id, user.tenant_id, project_id)
    n.status = "draft"
    n.paid_date = None
    db.commit()
    return {"id": n.id, "status": n.status}


@ap_router.get("/aging")
def ap_aging(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """買掛金エイジング: 未払の支払通知を支払期日の滞留で区分（テナント横断）。"""
    today = date.today()
    notices = (
        db.query(PaymentNotice)
        .filter(PaymentNotice.tenant_id == user.tenant_id, PaymentNotice.status != "paid")
        .all()
    )
    buckets = {"current": 0, "d1_30": 0, "d31_60": 0, "d61_90": 0, "over90": 0}
    rows = []
    total_ap = 0
    for n in notices:
        amt = int(n.total or 0)
        if amt <= 0:
            continue
        days_overdue = (today - n.payment_date).days if n.payment_date else 0
        b = _bucket(days_overdue)
        buckets[b] += amt
        total_ap += amt
        rows.append({
            "notice_id": n.id,
            "notice_number": n.notice_number,
            "project_id": n.project_id,
            "subcontractor_id": n.subcontractor_id,
            "total": amt,
            "payment_date": n.payment_date.isoformat() if n.payment_date else None,
            "days_overdue": max(0, days_overdue),
            "bucket": b,
        })
    rows.sort(key=lambda r: r["days_overdue"], reverse=True)
    return {"total_ap": total_ap, "buckets": buckets, "count": len(rows), "notices": rows}
