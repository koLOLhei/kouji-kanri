"""Inspection (検査) management tests."""


def test_list_inspections_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/inspections", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_inspection(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/inspections",
        json={
            "inspection_type": "self",
            "title": "鉄筋検査",
            "scheduled_date": "2026-05-10",
            "checklist_items": [{"item_name": "ピッチ", "standard": "@200"}],
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["title"] == "鉄筋検査"


def test_get_inspection(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    ins = client.post(
        f"/api/projects/{p.id}/inspections",
        json={"inspection_type": "self", "title": "T"},
        headers=auth(admin_a_token),
    ).json()
    r = client.get(f"/api/projects/{p.id}/inspections/{ins['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_update_inspection(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    ins = client.post(
        f"/api/projects/{p.id}/inspections",
        json={"inspection_type": "self", "title": "T"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/inspections/{ins['id']}",
        json={"result": "pass", "remarks": "良好"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_complete_inspection(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    ins = client.post(
        f"/api/projects/{p.id}/inspections",
        json={"inspection_type": "self", "title": "T"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/inspections/{ins['id']}/complete",
        json={"actual_date": "2026-05-04"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_inspections_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/inspections", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_filter_inspections_by_status(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    client.post(
        f"/api/projects/{p.id}/inspections",
        json={"inspection_type": "self", "title": "T1"},
        headers=auth(admin_a_token),
    )
    r = client.get(f"/api/projects/{p.id}/inspections?status=scheduled", headers=auth(admin_a_token))
    assert r.status_code == 200
