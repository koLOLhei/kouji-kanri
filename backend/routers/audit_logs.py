"""Audit log (監査ログ) router - admin only."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.audit_log import AuditLog
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


@router.get("")
def list_audit_logs(
    entity_type: str | None = None,
    entity_id: str | None = None,
    user_id: str | None = None,
    action: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="管理者権限が必要です")

    q = db.query(AuditLog).filter(AuditLog.tenant_id == user.tenant_id)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if date_from:
        q = q.filter(AuditLog.created_at >= date_from)
    if date_to:
        q = q.filter(AuditLog.created_at <= date_to)

    total = q.count()
    items = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{log_id}")
def get_audit_log(
    log_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    log = db.query(AuditLog).filter(
        AuditLog.id == log_id, AuditLog.tenant_id == user.tenant_id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="監査ログが見つかりません")
    return log
