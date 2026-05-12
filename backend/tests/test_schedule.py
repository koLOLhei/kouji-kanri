"""Schedule (Gantt / critical path / auto-schedule) tests."""


def test_get_gantt(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/schedule/gantt", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_critical_path(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/schedule/critical-path", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_schedule_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/schedule/gantt", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_auto_schedule(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.phase import Phase
    import uuid
    p = project_factory(tenant_a.id)
    db.add(Phase(id=str(uuid.uuid4()), project_id=p.id, name="P1", sort_order=0, duration_days=10))
    db.commit()
    r = client.post(
        f"/api/projects/{p.id}/schedule/auto-schedule",
        json={"project_start": "2026-05-04"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_schedule_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/schedule/gantt")
    assert r.status_code in (401, 403)
