"""Corrective action / NCR (是正処置) router."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.corrective_action import CorrectiveAction
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.timezone_utils import today_jst

router = APIRouter(prefix="/api/projects/{project_id}/corrective-actions", tags=["corrective-actions"])


# ---------- Schemas ----------

class CorrectiveActionCreate(BaseModel):
    title: str
    source_type: str | None = None
    source_id: str | None = None
    description: str | None = None
    location: str | None = None
    detected_date: date | None = None
    severity: str = "minor"
    root_cause: str | None = None
    corrective_action: str | None = None
    preventive_action: str | None = None
    assigned_to: str | None = None
    due_date: date | None = None
    photo_ids: list | None = None


class CorrectiveActionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    severity: str | None = None
    root_cause: str | None = None
    corrective_action: str | None = None
    preventive_action: str | None = None
    assigned_to: str | None = None
    due_date: date | None = None
    status: str | None = None
    photo_ids: list | None = None


class VerifyRequest(BaseModel):
    verification_result: str


# ---------- Endpoints ----------

def _next_ncr_number(db: Session, project_id: str) -> str:
    verify_project_access(project_id, user, db)
    max_num = db.query(func.count(CorrectiveAction.id)).filter(
        CorrectiveAction.project_id == project_id
    ).scalar()
    return f"NCR-{(max_num or 0) + 1:04d}"


@router.get("")
def list_corrective_actions(
    project_id: str,
    status: str | None = None,
    severity: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(CorrectiveAction).filter(CorrectiveAction.project_id == project_id)
    if status:
        q = q.filter(CorrectiveAction.status == status)
    if severity:
        q = q.filter(CorrectiveAction.severity == severity)
    return q.order_by(CorrectiveAction.created_at.desc()).all()


@router.post("")
def create_corrective_action(
    project_id: str,
    req: CorrectiveActionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ncr_number = _next_ncr_number(db, project_id)
    ca = CorrectiveAction(
        project_id=project_id,
        ncr_number=ncr_number,
        detected_by=user.id,
        **req.model_dump(),
    )
    db.add(ca)
    db.commit()
    db.refresh(ca)
    return ca


@router.get("/{ca_id}")
def get_corrective_action(
    project_id: str, ca_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ca = db.query(CorrectiveAction).filter(
        CorrectiveAction.id == ca_id, CorrectiveAction.project_id == project_id
    ).first()
    if not ca:
        raise HTTPException(status_code=404, detail="是正処置が見つかりません")
    return ca


@router.put("/{ca_id}")
def update_corrective_action(
    project_id: str, ca_id: str, req: CorrectiveActionUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ca = db.query(CorrectiveAction).filter(
        CorrectiveAction.id == ca_id, CorrectiveAction.project_id == project_id
    ).first()
    if not ca:
        raise HTTPException(status_code=404, detail="是正処置が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(ca, k, v)
    db.commit()
    db.refresh(ca)
    return ca


@router.delete("/{ca_id}")
def delete_corrective_action(
    project_id: str, ca_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ca = db.query(CorrectiveAction).filter(
        CorrectiveAction.id == ca_id, CorrectiveAction.project_id == project_id
    ).first()
    if not ca:
        raise HTTPException(status_code=404, detail="是正処置が見つかりません")
    db.delete(ca)
    db.commit()
    return {"status": "ok"}


@router.put("/{ca_id}/verify")
def verify_corrective_action(
    project_id: str, ca_id: str, req: VerifyRequest,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """Verify the corrective action was effective."""
    ca = db.query(CorrectiveAction).filter(
        CorrectiveAction.id == ca_id, CorrectiveAction.project_id == project_id
    ).first()
    if not ca:
        raise HTTPException(status_code=404, detail="是正処置が見つかりません")
    if ca.status not in ("in_progress", "completed"):
        raise HTTPException(status_code=400, detail="対応中または完了済みの是正処置のみ検証できます")
    ca.verification_result = req.verification_result
    ca.verified_by = user.id
    ca.verified_at = datetime.now(timezone.utc)
    ca.status = "verified"
    db.commit()
    db.refresh(ca)
    return ca


@router.put("/{ca_id}/close")
def close_corrective_action(
    project_id: str, ca_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """Close a verified corrective action."""
    ca = db.query(CorrectiveAction).filter(
        CorrectiveAction.id == ca_id, CorrectiveAction.project_id == project_id
    ).first()
    if not ca:
        raise HTTPException(status_code=404, detail="是正処置が見つかりません")
    if ca.status != "verified":
        raise HTTPException(status_code=400, detail="検証済みの是正処置のみクローズできます")
    ca.status = "closed"
    ca.completed_date = today_jst()
    db.commit()
    db.refresh(ca)
    return ca
