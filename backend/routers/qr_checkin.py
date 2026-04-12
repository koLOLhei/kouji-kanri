"""QR code check-in router."""

import json
import uuid
from datetime import datetime, date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.project import Project
from models.worker import Attendance
from models.equipment import Equipment
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/qr", tags=["qr-checkin"])


# ---------- Schemas ----------

class QRGenerateRequest(BaseModel):
    project_id: str
    phase_id: Optional[str] = None
    location: Optional[str] = None
    equipment_id: Optional[str] = None
    label: Optional[str] = None  # human-readable label for the QR


class QRPayload(BaseModel):
    qr_id: str
    project_id: str
    phase_id: Optional[str]
    location: Optional[str]
    equipment_id: Optional[str]
    label: Optional[str]
    generated_at: str
    tenant_id: str


class QRCheckinRequest(BaseModel):
    qr_data: str  # JSON string of QRPayload
    worker_id: Optional[str] = None  # explicit worker override
    notes: Optional[str] = None


class QRCheckinResult(BaseModel):
    attendance_id: str
    project_id: str
    project_name: Optional[str]
    phase_id: Optional[str]
    location: Optional[str]
    equipment_id: Optional[str]
    equipment_name: Optional[str]
    checked_in_at: str
    worker_id: Optional[str]
    prefill: dict[str, Any]  # data to pre-fill in forms


# ---------- Endpoints ----------

@router.post("/generate", response_model=QRPayload)
def generate_qr(
    req: QRGenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate QR code payload for a location or equipment.
    Returns a JSON payload — the frontend handles rendering the actual QR image.
    """
    verify_project_access(req.project_id, user, db)

    payload = QRPayload(
        qr_id=str(uuid.uuid4()),
        project_id=req.project_id,
        phase_id=req.phase_id,
        location=req.location,
        equipment_id=req.equipment_id,
        label=req.label,
        generated_at=datetime.utcnow().isoformat(),
        tenant_id=user.tenant_id,
    )
    return payload


@router.post("/checkin", response_model=QRCheckinResult)
def qr_checkin(
    req: QRCheckinRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Record a check-in from a scanned QR code.
    Creates an attendance record and returns pre-fill context.
    """
    try:
        payload = json.loads(req.qr_data)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="無効なQRコードデータです")

    project_id = payload.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="QRコードにプロジェクト情報がありません")

    # Verify tenant ownership
    qr_tenant = payload.get("tenant_id")
    if qr_tenant and qr_tenant != user.tenant_id:
        raise HTTPException(status_code=403, detail="テナントが一致しません")

    verify_project_access(project_id, user, db)

    # Resolve project name
    project = db.query(Project).filter(Project.id == project_id).first()
    project_name = project.name if project else None

    # Resolve equipment name
    equipment_id = payload.get("equipment_id")
    equipment_name = None
    if equipment_id:
        eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
        equipment_name = eq.name if eq else None

    # Determine worker_id: explicit override or fallback to user's worker record if available
    worker_id = req.worker_id

    # Create an attendance record
    now = datetime.utcnow()
    attendance = Attendance(
        project_id=project_id,
        worker_id=worker_id or user.id,
        work_date=now.date(),
        check_in=now,
        work_type="regular",
        notes=req.notes or f"QRチェックイン: {payload.get('location', '')}",
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    # Build pre-fill data for forms
    prefill: dict[str, Any] = {
        "project_id": project_id,
        "project_name": project_name,
    }
    if payload.get("phase_id"):
        prefill["phase_id"] = payload["phase_id"]
    if payload.get("location"):
        prefill["location"] = payload["location"]
    if equipment_id:
        prefill["equipment_id"] = equipment_id
        prefill["equipment_name"] = equipment_name

    return QRCheckinResult(
        attendance_id=attendance.id,
        project_id=project_id,
        project_name=project_name,
        phase_id=payload.get("phase_id"),
        location=payload.get("location"),
        equipment_id=equipment_id,
        equipment_name=equipment_name,
        checked_in_at=now.isoformat(),
        worker_id=worker_id or user.id,
        prefill=prefill,
    )
