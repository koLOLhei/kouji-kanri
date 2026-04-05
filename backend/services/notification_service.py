"""Notification creation helper."""

from sqlalchemy.orm import Session
from models.notification import Notification


def create_notification(
    db: Session,
    tenant_id: str,
    user_id: str,
    notification_type: str,
    title: str,
    message: str | None = None,
    link_url: str | None = None,
    related_entity_type: str | None = None,
    related_entity_id: str | None = None,
):
    """Create a notification for a user."""
    notif = Notification(
        tenant_id=tenant_id,
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        link_url=link_url,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
    )
    db.add(notif)
    db.commit()
    return notif


def notify_project_admins(
    db: Session,
    tenant_id: str,
    notification_type: str,
    title: str,
    message: str | None = None,
    link_url: str | None = None,
):
    """Send notification to all admins of a tenant."""
    from models.user import User
    admins = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role.in_(["admin", "project_manager"]),
        User.is_active == True,
    ).all()
    for admin in admins:
        create_notification(db, tenant_id, admin.id, notification_type, title, message, link_url)
