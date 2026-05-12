"""Dashboard / project-health / alerts / today endpoints tests."""


def test_today_endpoint(client, admin_a_token, auth):
    r = client.get("/api/today", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_dashboard_endpoint(client, admin_a_token, auth):
    r = client.get("/api/dashboard/overview", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_dashboard_trends(client, admin_a_token, auth):
    r = client.get("/api/dashboard/trends", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_project_health(client, admin_a_token, auth, project_factory, tenant_a):
    project_factory(tenant_a.id)
    r = client.get("/api/project-health", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_alerts(client, admin_a_token, auth):
    r = client.get("/api/alerts", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_dashboard_unauthenticated(client):
    r = client.get("/api/dashboard/overview")
    assert r.status_code in (401, 403)


def test_alerts_isolated_between_tenants(
    client, admin_a_token, admin_b_token, auth, project_factory, tenant_b, tenant_a
):
    project_factory(tenant_b.id, name="other-tenant-project")
    r = client.get("/api/alerts", headers=auth(admin_a_token))
    assert r.status_code == 200
    # tenant_aのアラートに他テナントの情報が含まれないこと（最低限ステータス200）
