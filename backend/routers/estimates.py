"""見積書 (Estimate) router — CRUD + 自動計算 + PDF生成。"""
from config import app_settings
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.estimate_generator import calculate_estimate, generate_estimate_pdf, UNIT_PRICES

router = APIRouter(prefix="/api/estimates", tags=["estimates"])


# ---------- Schemas ----------

class EstimateCreate(BaseModel):
    project_name: str
    customer_id: str | None = None
    customer_name: str | None = None
    items: list | None = None
    subtotal: int = 0
    tax_rate: float = app_settings.default_tax_rate
    valid_until: date | None = None
    notes: str | None = None


class EstimateUpdate(BaseModel):
    project_name: str | None = None
    customer_id: str | None = None
    customer_name: str | None = None
    items: list | None = None
    subtotal: int | None = None
    tax_rate: float | None = None
    valid_until: date | None = None
    status: str | None = None
    notes: str | None = None


# ---------- Helpers ----------

def _generate_estimate_number(tenant_id: str, db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"EST-{year}-"
    count = db.query(func.count(Estimate.id)).filter(
        Estimate.tenant_id == tenant_id,
        Estimate.estimate_number.like(f"{prefix}%"),
    ).scalar() or 0
    return f"{prefix}{count + 1:03d}"


def _calc_tax(subtotal: int, tax_rate: float) -> tuple[int, int]:
    tax_amount = int(subtotal * tax_rate / 100)
    total = subtotal + tax_amount
    return tax_amount, total


# ---------- Endpoints ----------

@router.get("")
def list_estimates(
    status: str | None = None,
    customer_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Estimate).filter(Estimate.tenant_id == user.tenant_id)
    if status:
        q = q.filter(Estimate.status == status)
    if customer_id:
        q = q.filter(Estimate.customer_id == customer_id)
    return q.order_by(Estimate.created_at.desc()).all()


@router.post("", status_code=201)
def create_estimate(
    body: EstimateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tax_amount, total = _calc_tax(body.subtotal, body.tax_rate)
    estimate_number = _generate_estimate_number(user.tenant_id, db)
    record = Estimate(
        tenant_id=user.tenant_id,
        estimate_number=estimate_number,
        tax_amount=tax_amount,
        total=total,
        created_by=user.id,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{estimate_id}")
def get_estimate(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    return record


@router.put("/{estimate_id}")
def update_estimate(
    estimate_id: str,
    body: EstimateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(record, k, v)
    # Recalculate tax if subtotal or tax_rate changed
    subtotal = data.get("subtotal", record.subtotal)
    tax_rate = data.get("tax_rate", record.tax_rate)
    if "subtotal" in data or "tax_rate" in data:
        record.tax_amount, record.total = _calc_tax(subtotal, tax_rate)
    db.commit()
    db.refresh(record)
    return record


@router.post("/{estimate_id}/convert-to-project", status_code=201)
def convert_estimate_to_project(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """見積書を案件に変換する。"""
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.tenant_id == user.tenant_id,
    ).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    if estimate.status == "accepted":
        raise HTTPException(status_code=400, detail="この見積書は既に受注済みです")

    project = Project(
        tenant_id=user.tenant_id,
        name=estimate.project_name,
        contract_amount=estimate.total,
        client_name=estimate.customer_name,
    )
    db.add(project)

    estimate.status = "accepted"

    db.commit()
    db.refresh(project)
    db.refresh(estimate)
    return {"project": project, "estimate": estimate}


# ---------- 自動計算 + PDF ----------

class QuickEstimateItem(BaseModel):
    item_code: str
    quantity: float
    unit_price: float | None = None
    note: str = ""


class QuickEstimateRequest(BaseModel):
    client_name: str
    project_name: str
    location: str = ""
    items: list[QuickEstimateItem]
    warranty: str = ""


@router.get("/unit-prices")
def list_unit_prices(user: User = Depends(get_current_user)):
    """工種別の標準単価一覧。フロントのドロップダウン/自動入力用。"""
    return UNIT_PRICES


@router.post("/quick-calculate")
def quick_calculate(req: QuickEstimateRequest, user: User = Depends(get_current_user)):
    """見積金額をリアルタイム計算（PDF生成なし）。"""
    items = [item.model_dump() for item in req.items]
    return calculate_estimate(items)


@router.post("/generate-pdf")
def generate_pdf(req: QuickEstimateRequest, user: User = Depends(get_current_user)):
    """見積書PDFを自動生成してダウンロード。平米単価×面積で自動計算。"""
    items = [item.model_dump() for item in req.items]
    try:
        pdf_bytes = generate_estimate_pdf(
            client_name=req.client_name,
            project_name=req.project_name,
            location=req.location,
            items=items,
            warranty=req.warranty,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成に失敗: {e}")

    safe_name = req.client_name.replace("/", "-").replace("\\", "-")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''見積書_{safe_name}.pdf",
            "Content-Length": str(len(pdf_bytes)),
        },
    )
