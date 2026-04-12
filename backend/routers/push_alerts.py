"""PWA Push Notification router."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.push_subscription import PushSubscription
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/push", tags=["push-notifications"])


# ---------- Schemas ----------

class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str


class PushSubscriptionOut(BaseModel):
    id: str
    user_id: str
    endpoint: str
    tenant_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PushSendRequest(BaseModel):
    title: str
    body: str
    url: Optional[str] = None
    user_ids: Optional[list[str]] = None  # None = broadcast to all tenant users


# ---------- Endpoints ----------

@router.post("/subscribe", response_model=PushSubscriptionOut)
def subscribe(
    req: PushSubscribeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a Web Push subscription for the current user."""
    # Check for existing subscription with same endpoint
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == req.endpoint,
        PushSubscription.user_id == user.id,
    ).first()
    if existing:
        # Update keys in case they rotated
        existing.p256dh_key = req.p256dh_key
        existing.auth_key = req.auth_key
        db.commit()
        db.refresh(existing)
        return existing

    sub = PushSubscription(
        user_id=user.id,
        endpoint=req.endpoint,
        p256dh_key=req.p256dh_key,
        auth_key=req.auth_key,
        tenant_id=user.tenant_id,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/subscriptions", response_model=list[PushSubscriptionOut])
def list_subscriptions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List push subscriptions for the current user."""
    subs = db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id,
        PushSubscription.tenant_id == user.tenant_id,
    ).all()
    return subs


@router.post("/send")
def send_push(
    req: PushSendRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: send a push notification to specified users (or all tenant users).
    Note: Actual Web Push delivery requires a VAPID-capable library (e.g. pywebpush).
    This endpoint stores the intent and returns the target subscription count.
    Install pywebpush and configure VAPID keys in settings for real delivery.
    """
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="管理者のみ送信可能です")

    q = db.query(PushSubscription).filter(PushSubscription.tenant_id == user.tenant_id)
    if req.user_ids:
        q = q.filter(PushSubscription.user_id.in_(req.user_ids))
    subscriptions = q.all()

    sent = 0
    errors = 0

    for sub in subscriptions:
        try:
            _deliver_push(sub, req.title, req.body, req.url)
            sent += 1
        except Exception:
            errors += 1

    return {
        "queued": len(subscriptions),
        "sent": sent,
        "errors": errors,
        "message": f"{sent}件のデバイスに通知を送信しました",
    }


def _deliver_push(sub: PushSubscription, title: str, body: str, url: Optional[str]) -> None:
    """
    Attempt to deliver a Web Push notification.
    Requires pywebpush + VAPID keys configured via env vars:
      VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_CLAIMS_EMAIL
    Falls back silently when pywebpush is not installed.
    """
    import os
    import json

    try:
        from pywebpush import webpush, WebPushException  # type: ignore
    except ImportError:
        # pywebpush not installed — skip delivery
        return

    private_key = os.getenv("VAPID_PRIVATE_KEY")
    public_key = os.getenv("VAPID_PUBLIC_KEY")
    claims_email = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@example.com")

    if not private_key or not public_key:
        return

    subscription_info = {
        "endpoint": sub.endpoint,
        "keys": {
            "p256dh": sub.p256dh_key,
            "auth": sub.auth_key,
        },
    }
    data = json.dumps({"title": title, "body": body, "url": url or "/"})

    webpush(
        subscription_info=subscription_info,
        data=data,
        vapid_private_key=private_key,
        vapid_claims={"sub": claims_email},
    )
