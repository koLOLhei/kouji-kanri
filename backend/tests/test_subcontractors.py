"""Subcontractor + Contract tests + tenant isolation."""


def _create_sub(client, token, auth, name="協力会社A"):
    return client.post(
        "/api/subcontractors",
        json={"company_name": name},
        headers=auth(token),
    )


def test_list_subcontractors_empty(client, admin_a_token, auth):
    r = client.get("/api/subcontractors", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_subcontractor(client, admin_a_token, auth):
    r = _create_sub(client, admin_a_token, auth, "鉄筋加工KK")
    assert r.status_code == 200
    assert r.json()["company_name"] == "鉄筋加工KK"


def test_get_subcontractor(client, admin_a_token, auth):
    s = _create_sub(client, admin_a_token, auth).json()
    r = client.get(f"/api/subcontractors/{s['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_update_subcontractor(client, admin_a_token, auth):
    s = _create_sub(client, admin_a_token, auth).json()
    r = client.put(
        f"/api/subcontractors/{s['id']}",
        json={"company_name": "改名"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["company_name"] == "改名"


def test_subcontractors_isolated_per_tenant(client, admin_a_token, admin_b_token, auth):
    _create_sub(client, admin_a_token, auth, "A-Sub")
    _create_sub(client, admin_b_token, auth, "B-Sub")
    r = client.get("/api/subcontractors", headers=auth(admin_a_token))
    names = [s["company_name"] for s in r.json()]
    assert names == ["A-Sub"]


def test_cannot_get_other_tenant_subcontractor(client, admin_a_token, admin_b_token, auth):
    s_b = _create_sub(client, admin_b_token, auth).json()
    r = client.get(f"/api/subcontractors/{s_b['id']}", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_create_contract(client, admin_a_token, auth, project_factory, tenant_a):
    s = _create_sub(client, admin_a_token, auth).json()
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/contracts",
        json={
            "subcontractor_id": s["id"],
            "contract_type": "primary",
            "work_scope": "鉄筋加工",
            "contract_amount": 1000000,
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_construction_system(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/construction-system", headers=auth(admin_a_token))
    assert r.status_code == 200
