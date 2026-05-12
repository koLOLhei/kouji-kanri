"""Calendar / Milestone tests."""


def test_calendar_endpoint(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/calendar", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_milestone(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/calendar/milestones",
        json={
            "title": "竣工検査",
            "milestone_type": "inspection",
            "due_date": "2026-12-31",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_list_milestones(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    client.post(
        f"/api/projects/{p.id}/calendar/milestones",
        json={"title": "M1", "milestone_type": "x", "due_date": "2026-12-31"},
        headers=auth(admin_a_token),
    )
    r = client.get(f"/api/projects/{p.id}/calendar/milestones", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_update_milestone(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    m = client.post(
        f"/api/projects/{p.id}/calendar/milestones",
        json={"title": "M", "milestone_type": "x", "due_date": "2026-12-31"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/calendar/milestones/{m['id']}",
        json={"title": "更新"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["title"] == "更新"


def test_delete_milestone(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    m = client.post(
        f"/api/projects/{p.id}/calendar/milestones",
        json={"title": "x", "milestone_type": "x", "due_date": "2026-12-31"},
        headers=auth(admin_a_token),
    ).json()
    r = client.delete(
        f"/api/projects/{p.id}/calendar/milestones/{m['id']}",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_calendar_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/calendar", headers=auth(admin_a_token))
    assert r.status_code == 404
