"""Data export tests."""


def test_csv_export_daily_reports(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(
        f"/api/projects/{p.id}/exports/daily-reports",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_csv_export_attendance(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(
        f"/api/projects/{p.id}/exports/attendance",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_csv_export_costs(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(
        f"/api/projects/{p.id}/exports/costs",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_csv_export_inspections(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(
        f"/api/projects/{p.id}/exports/inspections",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_export_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(
        f"/api/projects/{p.id}/exports/daily-reports",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_admin_data_export_blocked_for_worker(client, worker_a_token, auth):
    r = client.get("/api/admin/data-export", headers=auth(worker_a_token))
    assert r.status_code == 403


def test_admin_data_export_allows_admin(client, admin_a_token, auth):
    r = client.get("/api/admin/data-export", headers=auth(admin_a_token))
    assert r.status_code == 200
