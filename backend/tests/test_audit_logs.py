"""Audit log tests."""

import uuid


def _create_log(db, tenant_id, user_id, **kw):
    from models.audit_log import AuditLog
    log = AuditLog(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        user_id=user_id,
        user_email=kw.pop("user_email", "test@example.com"),
        entity_type=kw.pop("entity_type", "project"),
        entity_id=kw.pop("entity_id", "00000000-0000-0000-0000-000000000001"),
        action=kw.pop("action", "create"),
        **kw,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def test_admin_can_list_audit_logs(client, db, admin_a, admin_a_token, auth):
    _create_log(db, admin_a.tenant_id, admin_a.id)
    r = client.get("/api/audit-logs", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["total"] == 1


def test_worker_cannot_list_audit_logs(client, worker_a_token, auth):
    r = client.get("/api/audit-logs", headers=auth(worker_a_token))
    assert r.status_code == 403


def test_audit_logs_isolated_per_tenant(
    client, db, admin_a, admin_b, admin_a_token, admin_b_token, auth
):
    _create_log(db, admin_a.tenant_id, admin_a.id, action="A")
    _create_log(db, admin_b.tenant_id, admin_b.id, action="B")

    r_a = client.get("/api/audit-logs", headers=auth(admin_a_token))
    actions_a = [l["action"] for l in r_a.json()["items"]]
    assert actions_a == ["A"]

    r_b = client.get("/api/audit-logs", headers=auth(admin_b_token))
    actions_b = [l["action"] for l in r_b.json()["items"]]
    assert actions_b == ["B"]


def test_filter_by_action(client, db, admin_a, admin_a_token, auth):
    _create_log(db, admin_a.tenant_id, admin_a.id, action="create")
    _create_log(db, admin_a.tenant_id, admin_a.id, action="delete")
    r = client.get("/api/audit-logs?action=delete", headers=auth(admin_a_token))
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["action"] == "delete"


def test_get_specific_audit_log(client, db, admin_a, admin_a_token, auth):
    log = _create_log(db, admin_a.tenant_id, admin_a.id)
    r = client.get(f"/api/audit-logs/{log.id}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_cannot_get_audit_log_of_other_tenant(
    client, db, admin_b, admin_a_token, auth
):
    log = _create_log(db, admin_b.tenant_id, admin_b.id)
    r = client.get(f"/api/audit-logs/{log.id}", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_audit_logs_unauthenticated(client):
    r = client.get("/api/audit-logs")
    assert r.status_code in (401, 403)
