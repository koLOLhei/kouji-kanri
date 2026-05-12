"""Notification tests + tenant isolation defense-in-depth."""

import uuid


def _make_notification(db, tenant_id: str, user_id: str, **kw):
    from models.notification import Notification
    n = Notification(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        user_id=user_id,
        notification_type=kw.pop("notification_type", "info"),
        title=kw.pop("title", "テスト通知"),
        message=kw.pop("message", "本文"),
        is_read=kw.pop("is_read", False),
        **kw,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def test_list_notifications_empty(client, admin_a_token, auth):
    r = client.get("/api/notifications", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["total"] == 0
    assert r.json()["items"] == []


def test_unread_count_zero(client, admin_a_token, auth):
    r = client.get("/api/notifications/unread-count", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["count"] == 0


def test_list_returns_user_notifications(client, db, admin_a, admin_a_token, auth):
    _make_notification(db, admin_a.tenant_id, admin_a.id, title="A1")
    _make_notification(db, admin_a.tenant_id, admin_a.id, title="A2")
    r = client.get("/api/notifications", headers=auth(admin_a_token))
    assert r.json()["total"] == 2


def test_unread_count_counts_only_unread(client, db, admin_a, admin_a_token, auth):
    _make_notification(db, admin_a.tenant_id, admin_a.id, is_read=False)
    _make_notification(db, admin_a.tenant_id, admin_a.id, is_read=True)
    r = client.get("/api/notifications/unread-count", headers=auth(admin_a_token))
    assert r.json()["count"] == 1


def test_mark_read(client, db, admin_a, admin_a_token, auth):
    n = _make_notification(db, admin_a.tenant_id, admin_a.id, is_read=False)
    r = client.put(f"/api/notifications/{n.id}/read", headers=auth(admin_a_token))
    assert r.status_code == 200
    db.refresh(n)
    assert n.is_read is True


def test_mark_all_read(client, db, admin_a, admin_a_token, auth):
    for _ in range(3):
        _make_notification(db, admin_a.tenant_id, admin_a.id, is_read=False)
    r = client.put("/api/notifications/mark-all-read", headers=auth(admin_a_token))
    assert r.status_code == 200
    rl = client.get("/api/notifications/unread-count", headers=auth(admin_a_token))
    assert rl.json()["count"] == 0


def test_delete_notification(client, db, admin_a, admin_a_token, auth):
    n = _make_notification(db, admin_a.tenant_id, admin_a.id)
    r = client.delete(f"/api/notifications/{n.id}", headers=auth(admin_a_token))
    assert r.status_code == 200
    rl = client.get("/api/notifications", headers=auth(admin_a_token))
    assert rl.json()["total"] == 0


def test_cannot_read_notification_of_other_user(
    client, db, admin_a, admin_b, admin_a_token, auth
):
    """Different tenants can't read each other's notifications."""
    n_b = _make_notification(db, admin_b.tenant_id, admin_b.id)
    r = client.put(f"/api/notifications/{n_b.id}/read", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_delete_notification_of_other_tenant(
    client, db, admin_a, admin_b, admin_a_token, auth
):
    n_b = _make_notification(db, admin_b.tenant_id, admin_b.id)
    r = client.delete(f"/api/notifications/{n_b.id}", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_list_only_returns_own_notifications(
    client, db, admin_a, admin_b, admin_a_token, auth
):
    _make_notification(db, admin_a.tenant_id, admin_a.id, title="own")
    _make_notification(db, admin_b.tenant_id, admin_b.id, title="other")
    r = client.get("/api/notifications", headers=auth(admin_a_token))
    titles = [n["title"] for n in r.json()["items"]]
    assert titles == ["own"]


def test_unauthenticated_rejected(client):
    r = client.get("/api/notifications")
    assert r.status_code in (401, 403)


def test_mark_nonexistent_notification_returns_404(client, admin_a_token, auth):
    r = client.put(
        "/api/notifications/00000000-0000-0000-0000-000000000000/read",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_filter_unread_only(client, db, admin_a, admin_a_token, auth):
    _make_notification(db, admin_a.tenant_id, admin_a.id, is_read=False, title="unread1")
    _make_notification(db, admin_a.tenant_id, admin_a.id, is_read=True, title="read1")
    r = client.get("/api/notifications?is_read=false", headers=auth(admin_a_token))
    titles = [n["title"] for n in r.json()["items"]]
    assert "unread1" in titles
    assert "read1" not in titles


def test_pagination(client, db, admin_a, admin_a_token, auth):
    for i in range(5):
        _make_notification(db, admin_a.tenant_id, admin_a.id, title=f"n{i}")
    r = client.get("/api/notifications?limit=2&offset=0", headers=auth(admin_a_token))
    assert len(r.json()["items"]) == 2
    assert r.json()["total"] == 5
