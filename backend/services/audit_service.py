"""Audit logging service."""

from sqlalchemy.orm import Session
from models.audit_log import AuditLog
from models.user import User


def log_audit(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    changes: dict | None = None,
    ip_address: str | None = None,
):
    """Record an audit log entry."""
    log = AuditLog(
        tenant_id=user.tenant_id,
        user_id=user.id,
        user_email=user.email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=changes,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()
