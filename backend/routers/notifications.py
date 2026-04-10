"""Notification (通知) router."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.notification import Notification
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    is_read: bool | None = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.tenant_id == user.tenant_id,
    )
    if is_read is not None:
        q = q.filter(Notification.is_read == is_read)
    return q.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/unread-count")
def unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == user.id,
        Notification.tenant_id == user.tenant_id,
        Notification.is_read == False,
    ).scalar()
    return {"count": count}


@router.put("/{notification_id}/read")
def mark_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="通知が見つかりません")
    n.is_read = True
    n.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.put("/mark-all-read")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.tenant_id == user.tenant_id,
        Notification.is_read == False,
    ).update({"is_read": True, "read_at": datetime.now(timezone.utc)})
    db.commit()
    return {"status": "ok"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="通知が見つかりません")
    db.delete(n)
    db.commit()
    return {"status": "ok"}
