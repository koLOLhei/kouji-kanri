"""Server-Sent Events (SSE) router for real-time notifications."""

import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models.notification import Notification
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/sse", tags=["sse"])

# How often (in seconds) to push new notifications to the client
_POLL_INTERVAL = 30


@router.get("/notifications")
async def notification_stream(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    SSE endpoint that streams new notifications to the client.

    The client receives:
      - A 'ping' event every 30 seconds to keep the connection alive.
      - A 'notification' event when there are new unread notifications,
        containing a JSON payload with the unread count and latest items.

    Connect with:
        const es = new EventSource('/api/sse/notifications', {headers: {Authorization: 'Bearer ...'}});
        es.addEventListener('notification', e => console.log(JSON.parse(e.data)));
    """
    user_id = user.id
    tenant_id = user.tenant_id

    # Track the last notification id seen to detect new arrivals
    latest = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_read == False,
        )
        .order_by(Notification.created_at.desc())
        .first()
    )
    last_seen_id: str | None = latest.id if latest else None

    async def event_generator():
        nonlocal last_seen_id

        # Send an initial ping immediately so the browser knows the connection is live
        yield "event: ping\ndata: connected\n\n"

        while True:
            # Check whether the client has disconnected
            if await request.is_disconnected():
                break

            await asyncio.sleep(_POLL_INTERVAL)

            # Reconnect check after sleep
            if await request.is_disconnected():
                break

            # Query for new unread notifications since the last check
            try:
                q = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id == user_id,
                        Notification.tenant_id == tenant_id,
                        Notification.is_read == False,
                    )
                    .order_by(Notification.created_at.desc())
                )
                unread_count = q.count()
                latest_notifications = q.limit(5).all()

                # Check whether there are any new notifications since the last ping
                newest_id = latest_notifications[0].id if latest_notifications else None
                has_new = newest_id != last_seen_id if newest_id else False

                if has_new or unread_count > 0:
                    last_seen_id = newest_id
                    payload = {
                        "unread_count": unread_count,
                        "has_new": has_new,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "notifications": [
                            {
                                "id": n.id,
                                "title": n.title,
                                "message": n.message,
                                "type": n.notification_type if hasattr(n, "notification_type") else None,
                                "created_at": n.created_at.isoformat() if n.created_at else None,
                            }
                            for n in latest_notifications
                        ],
                    }
                    yield f"event: notification\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
                else:
                    # Send a keepalive ping
                    yield "event: ping\ndata: ok\n\n"
            except Exception as e:
                print(f"[SSE] Error polling notifications for user {user_id}: {e}", flush=True)
                yield "event: ping\ndata: error\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
