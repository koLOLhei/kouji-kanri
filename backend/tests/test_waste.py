"""Waste manifest tests."""


def test_list_waste_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/waste-manifests", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_waste_manifest(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/waste-manifests",
        json={
            "manifest_number": "MF-001",
            "waste_type": "コンクリート",
            "waste_category": "general_industrial",
            "quantity": 5.5,
            "unit": "t",
            "issued_date": "2026-05-04",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_negative_quantity_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/waste-manifests",
        json={
            "manifest_number": "MF-X",
            "waste_type": "x",
            "waste_category": "general_industrial",
            "quantity": -1,
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 422


def test_waste_summary(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/waste-manifests/summary", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_waste_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/waste-manifests", headers=auth(admin_a_token))
    assert r.status_code == 404
