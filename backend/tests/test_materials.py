"""Material orders / test records tests."""


def test_list_orders_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/materials/orders", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_order(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/materials/orders",
        json={
            "order_number": "PO-001",
            "supplier_name": "業者X",
            "order_date": "2026-04-01",
            "items": [
                {"material_name": "鉄筋", "quantity": 100, "unit": "本", "unit_price": 500},
            ],
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["supplier_name"] == "業者X"


def test_negative_quantity_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/materials/orders",
        json={"items": [{"material_name": "x", "quantity": -1}]},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 422


def test_create_test_record(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/materials/test-records",
        json={
            "material_name": "コンクリート",
            "test_type": "圧縮強度",
            "test_date": "2026-04-10",
            "judgment": "pass",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["judgment"] == "pass"


def test_list_test_records(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    client.post(
        f"/api/projects/{p.id}/materials/test-records",
        json={"material_name": "x", "test_type": "y"},
        headers=auth(admin_a_token),
    )
    r = client.get(f"/api/projects/{p.id}/materials/test-records", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_materials_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/materials/orders", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_update_test_record(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    rec = client.post(
        f"/api/projects/{p.id}/materials/test-records",
        json={"material_name": "x", "test_type": "y"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/materials/test-records/{rec['id']}",
        json={"judgment": "fail"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["judgment"] == "fail"


def test_materials_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/materials/orders")
    assert r.status_code in (401, 403)
