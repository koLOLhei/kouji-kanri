"""請求書 (Invoice) + 支払通知 (PaymentNotice) router."""
from config import app_settings

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from services.tax_breakdown import compute_tax_breakdown
from database import get_db
from models.business_docs import Invoice, PaymentNotice
from models.progress_statement import ProgressStatement
from models.tenant import Tenant
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}", tags=["invoices", "payment-notices"])


# ---------- Schemas ----------

class InvoiceCreate(BaseModel):
    invoice_date: date
    due_date: date | None = None
    customer_name: str | None = None
    period_from: date | None = None
    period_to: date | None = None
    items: list | None = None
    subtotal: int = 0
    tax_rate: float = app_settings.default_tax_rate
    invoice_registration_number: str | None = None
    notes: str | None = None


class InvoiceUpdate(BaseModel):
    invoice_date: date | None = None
    due_date: date | None = None
    customer_name: str | None = None
    period_from: date | None = None
    period_to: date | None = None
    items: list | None = None
    subtotal: int | None = None
    tax_rate: float | None = None
    invoice_registration_number: str | None = None
    status: str | None = None
    paid_date: date | None = None
    notes: str | None = None


class AdditionalItem(BaseModel):
    name: str
    amount: int
    tax_rate: float | None = None  # 明細ごとの税率（8%軽減等）。未指定は請求書の既定税率


class InvoiceFromProgressStatement(BaseModel):
    progress_statement_id: str
    additional_items: list[AdditionalItem] | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    customer_name: str | None = None
    tax_rate: float = app_settings.default_tax_rate
    notes: str | None = None


class InvoiceDeposit(BaseModel):
    amount: int
    due_date: date | None = None
    notes: str | None = None
    invoice_date: date | None = None
    customer_name: str | None = None
    tax_rate: float = app_settings.default_tax_rate


class InvoiceAdditional(BaseModel):
    title: str | None = None
    items: list[AdditionalItem] | None = None
    total: int | None = None
    due_date: date | None = None
    invoice_date: date | None = None
    customer_name: str | None = None
    tax_rate: float = app_settings.default_tax_rate


class InvoiceFinal(BaseModel):
    note: str | None = None
    due_date: date | None = None
    invoice_date: date | None = None
    customer_name: str | None = None
    tax_rate: float = app_settings.default_tax_rate


class PaymentNoticeCreate(BaseModel):
    subcontractor_id: str
    period_from: date | None = None
    period_to: date | None = None
    items: list | None = None
    subtotal: int = 0
    tax_rate: float = app_settings.default_tax_rate
    payment_date: date | None = None
    notes: str | None = None


class PaymentNoticeUpdate(BaseModel):
    period_from: date | None = None
    period_to: date | None = None
    items: list | None = None
    subtotal: int | None = None
    tax_rate: float | None = None
    payment_date: date | None = None
    status: str | None = None
    notes: str | None = None


# ---------- Helpers ----------

def _calc_tax(subtotal: int, tax_rate: float) -> tuple[int, int]:
    tax_amount = int(subtotal * tax_rate / 100)
    return tax_amount, subtotal + tax_amount


def _generate_number(prefix: str, tenant_id: str, model, number_col, db: Session) -> str:
    """Generate sequential number that never collides, even after deletions.

    Uses MAX of existing numbers instead of COUNT to avoid gaps causing duplicates.
    """
    from services.timezone_utils import now_jst
    year = now_jst().year
    pattern = f"{prefix}-{year}-"
    # Get the highest existing number suffix for this year
    max_number = db.query(func.max(number_col)).filter(
        model.tenant_id == tenant_id,
        number_col.like(f"{pattern}%"),
    ).scalar()
    if max_number:
        # Extract the numeric suffix (e.g., "INV-2026-042" → 42)
        try:
            last_num = int(max_number.split("-")[-1])
        except (ValueError, IndexError):
            last_num = 0
    else:
        last_num = 0
    return f"{pattern}{last_num + 1:03d}"


# ---------- Invoice Endpoints ----------

@router.get("/invoices")
def list_invoices(
    project_id: str,
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(Invoice).filter(
        Invoice.project_id == project_id,
        Invoice.tenant_id == user.tenant_id,
    )
    if status:
        q = q.filter(Invoice.status == status)
    return q.order_by(Invoice.created_at.desc()).all()


@router.post("/invoices", status_code=201)
def create_invoice(
    project_id: str,
    body: InvoiceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    tax_amount, total = _calc_tax(body.subtotal, body.tax_rate)
    invoice_number = _generate_number("INV", user.tenant_id, Invoice, Invoice.invoice_number, db)
    record = Invoice(
        tenant_id=user.tenant_id,
        project_id=project_id,
        invoice_number=invoice_number,
        tax_amount=tax_amount,
        total=total,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/invoices/from-progress-statement", status_code=201)
def create_invoice_from_progress_statement(
    project_id: str,
    body: InvoiceFromProgressStatement,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """指定された ProgressStatement の合計を 1 行で計上した請求書を作成。

    - 出来高調書合計を items に 1 行で計上
    - additional_items があれば Invoice.additional_items に保存
    - kind='progress', source_progress_statement_id を記録
    - Tenant の invoice_registration_number をスナップショット
    """
    verify_project_access(project_id, user, db)

    statement = db.query(ProgressStatement).filter(
        ProgressStatement.id == body.progress_statement_id,
        ProgressStatement.project_id == project_id,
        ProgressStatement.tenant_id == user.tenant_id,
    ).first()
    if not statement:
        raise HTTPException(status_code=404, detail="出来高調書が見つかりません")

    progress_amount = int(statement.total_progress_amount or 0)
    item_description = statement.title or (
        f"{statement.period_label} 出来高" if statement.period_label
        else f"{statement.year}年{statement.month}月 出来高"
    )
    items = [{"description": item_description, "amount": progress_amount}]

    additional_items_data = None
    additional_total = 0
    if body.additional_items:
        additional_items_data = [item.model_dump() for item in body.additional_items]
        additional_total = sum(int(item.amount) for item in body.additional_items)

    subtotal = progress_amount + additional_total
    tax_amount, total = _calc_tax(subtotal, body.tax_rate)

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    invoice_registration_number = tenant.invoice_registration_number if tenant else None

    invoice_number = _generate_number("INV", user.tenant_id, Invoice, Invoice.invoice_number, db)
    record = Invoice(
        tenant_id=user.tenant_id,
        project_id=project_id,
        invoice_number=invoice_number,
        invoice_date=body.invoice_date or date.today(),
        due_date=body.due_date,
        customer_name=body.customer_name,
        period_from=date(statement.year, statement.month, 1),
        period_to=None,
        items=items,
        subtotal=subtotal,
        tax_rate=body.tax_rate,
        tax_amount=tax_amount,
        total=total,
        invoice_registration_number=invoice_registration_number,
        status="draft",
        notes=body.notes,
        kind="progress",
        source_progress_statement_id=statement.id,
        additional_items=additional_items_data,
        created_by=user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/invoices/deposit", status_code=201)
def create_deposit_invoice(
    project_id: str,
    body: InvoiceDeposit,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """着手金請求書を作成 (kind='deposit')."""
    verify_project_access(project_id, user, db)

    subtotal = int(body.amount)
    tax_amount, total = _calc_tax(subtotal, body.tax_rate)
    items = [{"description": "着手金", "amount": subtotal}]

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    invoice_registration_number = tenant.invoice_registration_number if tenant else None

    invoice_number = _generate_number("INV", user.tenant_id, Invoice, Invoice.invoice_number, db)
    record = Invoice(
        tenant_id=user.tenant_id,
        project_id=project_id,
        invoice_number=invoice_number,
        invoice_date=body.invoice_date or date.today(),
        due_date=body.due_date,
        customer_name=body.customer_name,
        items=items,
        subtotal=subtotal,
        tax_rate=body.tax_rate,
        tax_amount=tax_amount,
        total=total,
        invoice_registration_number=invoice_registration_number,
        status="draft",
        notes=body.notes,
        kind="deposit",
        created_by=user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/invoices/additional", status_code=201)
def create_additional_invoice(
    project_id: str,
    body: InvoiceAdditional,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """追加請求書を作成 (kind='additional')."""
    verify_project_access(project_id, user, db)
    items = [i.model_dump() for i in (body.items or [])]
    if items:
        # 明細があるときは小計を明細合計に一致させ、税額を税率別(8%軽減等)に算出（整合性確保）
        subtotal = sum(int(i.get("amount") or 0) for i in items)
        breakdown = compute_tax_breakdown(items, body.tax_rate)
        tax_amount = sum(b["tax_amount"] for b in breakdown)
        total = subtotal + tax_amount
    else:
        subtotal = int(body.total or 0)
        tax_amount, total = _calc_tax(subtotal, body.tax_rate)
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    invoice_number = _generate_number("INV", user.tenant_id, Invoice, Invoice.invoice_number, db)
    record = Invoice(
        tenant_id=user.tenant_id,
        project_id=project_id,
        invoice_number=invoice_number,
        invoice_date=body.invoice_date or date.today(),
        due_date=body.due_date,
        customer_name=body.customer_name,
        items=items,
        subtotal=subtotal,
        tax_rate=body.tax_rate,
        tax_amount=tax_amount,
        total=total,
        invoice_registration_number=(tenant.invoice_registration_number if tenant else None),
        status="draft",
        notes=body.title,
        kind="additional",
        created_by=user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# 最終請求の残額計算で「請求済み」とみなす種別
_FINAL_BILLABLE_KINDS = ("progress", "deposit", "additional", "final")


@router.post("/invoices/final", status_code=201)
def create_final_invoice(
    project_id: str,
    body: InvoiceFinal,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """最終請求書を作成 (kind='final')。請負金額から既請求(税抜小計)を差し引いた残額を計上。

    ※ Project.contract_amount(請負金額)は税抜を前提に算出する。税込基準で運用している
       場合は調整が必要。変更契約(追加分)は別途『追加請求』で計上する想定。
    """
    project = verify_project_access(project_id, user, db)
    contract = int(project.contract_amount or 0)
    billed_subtotal = (
        db.query(func.coalesce(func.sum(Invoice.subtotal), 0))
        .filter(
            Invoice.tenant_id == user.tenant_id,
            Invoice.project_id == project_id,
            Invoice.kind.in_(_FINAL_BILLABLE_KINDS),
        )
        .scalar()
        or 0
    )
    remaining = max(0, contract - int(billed_subtotal))
    tax_amount, total = _calc_tax(remaining, body.tax_rate)
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    invoice_number = _generate_number("INV", user.tenant_id, Invoice, Invoice.invoice_number, db)
    record = Invoice(
        tenant_id=user.tenant_id,
        project_id=project_id,
        invoice_number=invoice_number,
        invoice_date=body.invoice_date or date.today(),
        due_date=body.due_date,
        customer_name=body.customer_name,
        items=[{"description": "最終請求（請負残額）", "amount": remaining}],
        subtotal=remaining,
        tax_rate=body.tax_rate,
        tax_amount=tax_amount,
        total=total,
        invoice_registration_number=(tenant.invoice_registration_number if tenant else None),
        status="draft",
        notes=body.note,
        kind="final",
        created_by=user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/invoices/{invoice_id}")
def get_invoice(
    project_id: str,
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.project_id == project_id,
        Invoice.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="請求書が見つかりません")
    return record


@router.put("/invoices/{invoice_id}")
def update_invoice(
    project_id: str,
    invoice_id: str,
    body: InvoiceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.project_id == project_id,
        Invoice.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="請求書が見つかりません")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        # subtotal / tax_rate を明示 null で上書きすると NOT NULL 制約違反になるためスキップ
        if k in ("subtotal", "tax_rate") and v is None:
            continue
        setattr(record, k, v)
    if "subtotal" in data or "tax_rate" in data:
        # 明示的な null が来ても既存値にフォールバックして 500 を防ぐ
        subtotal = data.get("subtotal")
        if subtotal is None:
            subtotal = record.subtotal or 0
        tax_rate = data.get("tax_rate")
        if tax_rate is None:
            tax_rate = record.tax_rate or 0
        record.tax_amount, record.total = _calc_tax(subtotal, tax_rate)
    db.commit()
    db.refresh(record)
    return record


# ---------- PaymentNotice Endpoints ----------

@router.get("/payment-notices")
def list_payment_notices(
    project_id: str,
    subcontractor_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(PaymentNotice).filter(
        PaymentNotice.project_id == project_id,
        PaymentNotice.tenant_id == user.tenant_id,
    )
    if subcontractor_id:
        q = q.filter(PaymentNotice.subcontractor_id == subcontractor_id)
    return q.order_by(PaymentNotice.created_at.desc()).all()


@router.post("/payment-notices", status_code=201)
def create_payment_notice(
    project_id: str,
    body: PaymentNoticeCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    tax_amount, total = _calc_tax(body.subtotal, body.tax_rate)
    notice_number = _generate_number("PAY", user.tenant_id, PaymentNotice, PaymentNotice.notice_number, db)
    record = PaymentNotice(
        tenant_id=user.tenant_id,
        project_id=project_id,
        notice_number=notice_number,
        tax_amount=tax_amount,
        total=total,
        **body.model_dump(exclude={"tax_rate"}),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/payment-notices/{notice_id}")
def update_payment_notice(
    project_id: str,
    notice_id: str,
    body: PaymentNoticeUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    record = db.query(PaymentNotice).filter(
        PaymentNotice.id == notice_id,
        PaymentNotice.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="支払通知が見つかりません")
    data = body.model_dump(exclude_unset=True)
    tax_rate = data.pop("tax_rate", None)
    for k, v in data.items():
        setattr(record, k, v)
    if "subtotal" in data or tax_rate is not None:
        subtotal = data.get("subtotal", record.subtotal)
        rate = tax_rate if tax_rate is not None else 10.0
        record.tax_amount, record.total = _calc_tax(subtotal, rate)
    db.commit()
    db.refresh(record)
    return record
