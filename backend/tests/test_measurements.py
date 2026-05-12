"""Measurement (出来形管理) tests."""


def test_list_measurements_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/measurements", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_measurement(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/measurements",
        json={
            "title": "壁厚計測",
            "measurement_type": "dimension",
            "items": [
                {"name": "壁厚", "design_value": 200, "actual_value": 198, "unit": "mm"},
            ],
            "overall_result": "pass",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_update_measurement(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    m = client.post(
        f"/api/projects/{p.id}/measurements",
        json={"title": "x", "measurement_type": "dimension"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/measurements/{m['id']}",
        json={"overall_result": "fail"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["overall_result"] == "fail"


def test_measurements_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/measurements", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_measurement_stats_endpoint(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/measurements/stats", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_measurement_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/measurements")
    assert r.status_code in (401, 403)
