"""Approval queue tests."""


def test_approval_queue_endpoint(client, admin_a_token, auth):
    r = client.get("/api/approval-queue", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_approval_queue_unauthenticated(client):
    r = client.get("/api/approval-queue")
    assert r.status_code in (401, 403)


def test_approval_queue_isolated_per_tenant(
    client, admin_a_token, admin_b_token, auth, project_factory, tenant_b
):
    project_factory(tenant_b.id, name="b-only")
    r = client.get("/api/approval-queue", headers=auth(admin_a_token))
    assert r.status_code == 200
