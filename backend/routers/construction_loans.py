"""建設ローン管理 — 分割払い・返済スケジュール・広告枠管理"""

from datetime import date, datetime, timezone
from dateutil.relativedelta import relativedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.construction_loan import ConstructionLoan, LoanPayment
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.timezone_utils import today_jst

router = APIRouter(prefix="/api/projects/{project_id}/loans", tags=["construction-loans"])


# ---------- Schemas ----------

class LoanCreate(BaseModel):
    borrower_name: str
    total_construction_cost: int
    upfront_payment_rate: float  # %
    interest_rate: float  # 年利 %
    interest_type: str = "fixed"
    repayment_months: int
    collateral_type: str | None = None
    collateral_description: str | None = None
    ad_space_enabled: bool = False
    ad_space_location: str | None = None
    ad_space_size: str | None = None
    notes: str | None = None


class LoanUpdate(BaseModel):
    borrower_name: str | None = None
    total_construction_cost: int | None = None
    upfront_payment_rate: float | None = None
    interest_rate: float | None = None
    interest_type: str | None = None
    repayment_months: int | None = None
    repayment_start_date: date | None = None
    collateral_type: str | None = None
    collateral_description: str | None = None
    collateral_value: int | None = None
    ad_space_enabled: bool | None = None
    ad_space_location: str | None = None
    ad_space_size: str | None = None
    ad_space_start_date: date | None = None
    ad_space_end_date: date | None = None
    status: str | None = None
    notes: str | None = None


# ---------- Helpers ----------

def _generate_loan_number(tenant_id: str, db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"LOAN-{year}-"
    count = db.query(func.count(ConstructionLoan.id)).filter(
        ConstructionLoan.tenant_id == tenant_id,
        ConstructionLoan.loan_number.like(f"{prefix}%"),
    ).scalar() or 0
    return f"{prefix}{count + 1:03d}"


# ---------- Endpoints ----------

@router.get("")
def list_loans(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return (
        db.query(ConstructionLoan)
        .filter(ConstructionLoan.project_id == project_id, ConstructionLoan.tenant_id == user.tenant_id)
        .order_by(ConstructionLoan.created_at.desc())
        .all()
    )


@router.post("", status_code=201)
def create_loan(
    project_id: str,
    req: LoanCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)

    # Auto-calc
    upfront_payment = int(req.total_construction_cost * req.upfront_payment_rate / 100)
    loan_amount = req.total_construction_cost - upfront_payment
    # Simple interest: monthly_payment = loan_amount * (1 + rate/100 * months/12) / months
    monthly_payment = int(
        loan_amount * (1 + req.interest_rate / 100 * req.repayment_months / 12) / req.repayment_months
    )

    loan = ConstructionLoan(
        tenant_id=user.tenant_id,
        project_id=project_id,
        loan_number=_generate_loan_number(user.tenant_id, db),
        borrower_name=req.borrower_name,
        total_construction_cost=req.total_construction_cost,
        upfront_payment=upfront_payment,
        upfront_payment_rate=req.upfront_payment_rate,
        loan_amount=loan_amount,
        interest_rate=req.interest_rate,
        interest_type=req.interest_type,
        repayment_months=req.repayment_months,
        monthly_payment=monthly_payment,
        remaining_balance=loan_amount,
        collateral_type=req.collateral_type,
        collateral_description=req.collateral_description,
        ad_space_enabled=req.ad_space_enabled,
        ad_space_location=req.ad_space_location,
        ad_space_size=req.ad_space_size,
        notes=req.notes,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


@router.get("/{loan_id}")
def get_loan(
    project_id: str,
    loan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    loan = db.query(ConstructionLoan).filter(
        ConstructionLoan.id == loan_id,
        ConstructionLoan.project_id == project_id,
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="ローンが見つかりません")
    payments = (
        db.query(LoanPayment)
        .filter(LoanPayment.loan_id == loan_id)
        .order_by(LoanPayment.payment_number)
        .all()
    )
    return {"loan": loan, "payments": payments}


@router.put("/{loan_id}")
def update_loan(
    project_id: str,
    loan_id: str,
    req: LoanUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    loan = db.query(ConstructionLoan).filter(
        ConstructionLoan.id == loan_id,
        ConstructionLoan.project_id == project_id,
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="ローンが見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(loan, k, v)
    db.commit()
    db.refresh(loan)
    return loan


# ---------- Payment Schedule Generation ----------

@router.post("/{loan_id}/generate-schedule", status_code=201)
def generate_payment_schedule(
    project_id: str,
    loan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    loan = db.query(ConstructionLoan).filter(
        ConstructionLoan.id == loan_id,
        ConstructionLoan.project_id == project_id,
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="ローンが見つかりません")
    if not loan.repayment_start_date:
        raise HTTPException(status_code=400, detail="返済開始日が設定されていません")

    # Delete existing schedule
    db.query(LoanPayment).filter(LoanPayment.loan_id == loan_id).delete()

    months = loan.repayment_months
    principal_per_month = loan.loan_amount // months
    remaining = loan.loan_amount
    payments = []

    for i in range(1, months + 1):
        # Equal principal repayment (元金均等)
        interest = int(remaining * loan.interest_rate / 12 / 100)
        # Last month: adjust principal to clear remaining
        principal = remaining if i == months else principal_per_month
        total = principal + interest
        remaining_after = remaining - principal

        payment = LoanPayment(
            loan_id=loan_id,
            payment_number=i,
            payment_date=loan.repayment_start_date + relativedelta(months=i - 1),
            principal=principal,
            interest=interest,
            total=total,
            remaining_after=remaining_after,
        )
        payments.append(payment)
        db.add(payment)
        remaining = remaining_after

    db.commit()
    return {"count": len(payments), "payments": payments}


# ---------- Payments ----------

@router.get("/{loan_id}/payments")
def list_payments(
    project_id: str,
    loan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return (
        db.query(LoanPayment)
        .filter(LoanPayment.loan_id == loan_id)
        .order_by(LoanPayment.payment_number)
        .all()
    )


@router.put("/{loan_id}/payments/{payment_id}/pay")
def mark_payment_paid(
    project_id: str,
    loan_id: str,
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    payment = db.query(LoanPayment).filter(
        LoanPayment.id == payment_id,
        LoanPayment.loan_id == loan_id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="返済記録が見つかりません")
    if payment.status == "paid":
        raise HTTPException(status_code=400, detail="既に支払済みです")

    payment.status = "paid"
    payment.paid_at = datetime.now(timezone.utc)

    # Update loan totals
    loan = db.query(ConstructionLoan).filter(ConstructionLoan.id == loan_id).first()
    loan.total_paid += payment.principal + payment.interest
    loan.remaining_balance -= payment.principal
    loan.last_payment_date = payment.payment_date

    if loan.remaining_balance <= 0:
        loan.remaining_balance = 0
        loan.status = "completed"

    db.commit()
    db.refresh(payment)
    return payment


# ---------- Dashboard ----------

@router.get("/{loan_id}/dashboard")
def loan_dashboard(
    project_id: str,
    loan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    loan = db.query(ConstructionLoan).filter(
        ConstructionLoan.id == loan_id,
        ConstructionLoan.project_id == project_id,
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="ローンが見つかりません")

    payments = (
        db.query(LoanPayment)
        .filter(LoanPayment.loan_id == loan_id)
        .order_by(LoanPayment.payment_number)
        .all()
    )

    today = today_jst()
    next_due = None
    overdue_count = 0
    for p in payments:
        if p.status != "paid":
            if p.payment_date < today:
                overdue_count += 1
            if next_due is None:
                next_due = p.payment_date

    return {
        "loan_number": loan.loan_number,
        "total_amount": loan.loan_amount,
        "total_paid": loan.total_paid,
        "remaining_balance": loan.remaining_balance,
        "next_due_date": next_due,
        "overdue_count": overdue_count,
        "ad_space_status": {
            "enabled": loan.ad_space_enabled,
            "location": loan.ad_space_location,
            "size": loan.ad_space_size,
            "start_date": loan.ad_space_start_date,
            "end_date": loan.ad_space_end_date,
        },
    }
