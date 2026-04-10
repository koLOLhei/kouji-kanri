"""請求書 (Invoice) + 支払通知 (PaymentNotice) router."""
from config import app_settings

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Invoice, PaymentNotice
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
    year = datetime.now(timezone.utc).year
    pattern = f"{prefix}-{year}-"
    count = db.query(func.count(model.id)).filter(
        model.tenant_id == tenant_id,
        number_col.like(f"{pattern}%"),
    ).scalar() or 0
    return f"{pattern}{count + 1:03d}"


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
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="請求書が見つかりません")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(record, k, v)
    if "subtotal" in data or "tax_rate" in data:
        subtotal = data.get("subtotal", record.subtotal)
        tax_rate = data.get("tax_rate", record.tax_rate)
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
