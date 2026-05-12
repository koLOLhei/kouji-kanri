"""Document dashboard / batch generation tests."""


def test_documents_dashboard(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/documents/dashboard", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_documents_missing(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/documents/missing", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_documents_dashboard_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/documents/dashboard", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_documents_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/documents/dashboard")
    assert r.status_code in (401, 403)
