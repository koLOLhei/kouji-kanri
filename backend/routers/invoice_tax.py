"""請求書の税率別区分(インボイス多税率)エンドポイント。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Invoice
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.tax_breakdown import compute_tax_breakdown

router = APIRouter(prefix="/api/projects/{project_id}/invoices", tags=["invoice-tax"])


@router.get("/{invoice_id}/tax-breakdown")
def invoice_tax_breakdown(
    project_id: str,
    invoice_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """請求明細を税率別(10%/8%軽減 等)に区分集計して返す。適格請求書の税率別記載用。"""
    verify_project_access(project_id, user, db)
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.tenant_id == user.tenant_id, Invoice.project_id == project_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="請求書が見つかりません")
    breakdown = compute_tax_breakdown(inv.items, float(inv.tax_rate or 10))
    return {
        "invoice_id": inv.id,
        "invoice_number": inv.invoice_number,
        "breakdown": breakdown,
        "total_taxable": sum(b["taxable_amount"] for b in breakdown),
        "total_tax": sum(b["tax_amount"] for b in breakdown),
    }
