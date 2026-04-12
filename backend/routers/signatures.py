"""Digital signature / hanko router."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.signature import DigitalSignature
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/signatures", tags=["signatures"])


# ---------- Schemas ----------

class SignatureCreate(BaseModel):
    entity_type: str  # "daily_report", "safety_pledge", "delivery", "inspection"
    entity_id: str
    signer_name: str
    signer_role: str  # "worker", "site_manager", "inspector", "client"
    signature_data: str  # Base64 encoded PNG from canvas.toDataURL()
    device_info: Optional[str] = None


class SignatureOut(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    signer_name: str
    signer_role: str
    signature_data: str
    signed_at: datetime
    ip_address: Optional[str]
    device_info: Optional[str]
    tenant_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Endpoints ----------

@router.post("", response_model=SignatureOut)
def create_signature(
    req_body: SignatureCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new digital signature for an entity."""
    # Validate signature_data is non-empty base64 data URL or raw base64
    if not req_body.signature_data or len(req_body.signature_data) < 10:
        raise HTTPException(status_code=400, detail="署名データが空です")

    # Extract client IP
    ip = request.headers.get("X-Forwarded-For") or request.client.host if request.client else None

    sig = DigitalSignature(
        entity_type=req_body.entity_type,
        entity_id=req_body.entity_id,
        signer_name=req_body.signer_name,
        signer_role=req_body.signer_role,
        signature_data=req_body.signature_data,
        signed_at=datetime.utcnow(),
        ip_address=str(ip)[:45] if ip else None,
        device_info=req_body.device_info[:200] if req_body.device_info else None,
        tenant_id=user.tenant_id,
    )
    db.add(sig)
    db.commit()
    db.refresh(sig)
    return sig


@router.get("", response_model=list[SignatureOut])
def list_signatures(
    entity_type: str = Query(...),
    entity_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all signatures for a specific entity."""
    sigs = (
        db.query(DigitalSignature)
        .filter(
            DigitalSignature.tenant_id == user.tenant_id,
            DigitalSignature.entity_type == entity_type,
            DigitalSignature.entity_id == entity_id,
        )
        .order_by(DigitalSignature.signed_at.asc())
        .all()
    )
    return sigs


@router.get("/{sig_id}", response_model=SignatureOut)
def get_signature(
    sig_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific signature by ID."""
    sig = db.query(DigitalSignature).filter(
        DigitalSignature.id == sig_id,
        DigitalSignature.tenant_id == user.tenant_id,
    ).first()
    if not sig:
        raise HTTPException(status_code=404, detail="署名が見つかりません")
    return sig


@router.delete("/{sig_id}")
def delete_signature(
    sig_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a signature (admin only)."""
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="管理者のみ削除可能です")
    sig = db.query(DigitalSignature).filter(
        DigitalSignature.id == sig_id,
        DigitalSignature.tenant_id == user.tenant_id,
    ).first()
    if not sig:
        raise HTTPException(status_code=404, detail="署名が見つかりません")
    db.delete(sig)
    db.commit()
    return {"status": "deleted"}
