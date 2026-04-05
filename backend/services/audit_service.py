"""Audit logging service with before/after diff capture."""

from typing import Any

from sqlalchemy.orm import Session
from models.audit_log import AuditLog
from models.user import User


def _serialize_value(value: Any) -> Any:
    """Convert non-JSON-serializable types to serializable forms."""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {k: _serialize_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialize_value(i) for i in value]
    # datetime, date, etc.
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _extract_model_dict(obj: Any, exclude: set[str] | None = None) -> dict:
    """Extract column values from a SQLAlchemy model instance."""
    if obj is None:
        return {}
    exclude = exclude or {"password_hash"}
    result = {}
    if hasattr(obj, "__table__"):
        for col in obj.__table__.columns:
            if col.name in exclude:
                continue
            result[col.name] = _serialize_value(getattr(obj, col.name, None))
    return result


def log_audit(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    changes: dict | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
):
    """Record an audit log entry with optional before/after values."""
    log = AuditLog(
        tenant_id=user.tenant_id,
        user_id=user.id,
        user_email=user.email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=changes,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()


def log_create(
    db: Session,
    user: User,
    entity_type: str,
    entity: Any,
    ip_address: str | None = None,
):
    """Convenience: log a CREATE action with new_values from the model instance."""
    new_vals = _extract_model_dict(entity)
    log_audit(
        db=db,
        user=user,
        action="create",
        entity_type=entity_type,
        entity_id=getattr(entity, "id", None),
        new_values=new_vals,
        ip_address=ip_address,
    )


def log_update(
    db: Session,
    user: User,
    entity_type: str,
    entity: Any,
    old_snapshot: dict,
    ip_address: str | None = None,
):
    """Convenience: log an UPDATE action, computing diff between old_snapshot and current state."""
    new_vals = _extract_model_dict(entity)
    # Compute diff: only fields that changed
    changed_keys = {k for k in set(old_snapshot) | set(new_vals) if old_snapshot.get(k) != new_vals.get(k)}
    changes = {k: {"old": old_snapshot.get(k), "new": new_vals.get(k)} for k in changed_keys}

    log_audit(
        db=db,
        user=user,
        action="update",
        entity_type=entity_type,
        entity_id=getattr(entity, "id", None),
        changes=changes if changes else None,
        old_values={k: old_snapshot.get(k) for k in changed_keys},
        new_values={k: new_vals.get(k) for k in changed_keys},
        ip_address=ip_address,
    )


def log_delete(
    db: Session,
    user: User,
    entity_type: str,
    entity: Any,
    ip_address: str | None = None,
):
    """Convenience: log a DELETE action with old_values from the model instance."""
    old_vals = _extract_model_dict(entity)
    log_audit(
        db=db,
        user=user,
        action="delete",
        entity_type=entity_type,
        entity_id=getattr(entity, "id", None),
        old_values=old_vals,
        ip_address=ip_address,
    )


def snapshot(entity: Any) -> dict:
    """Capture a snapshot of a model instance for use as old_values in log_update."""
    return _extract_model_dict(entity)
