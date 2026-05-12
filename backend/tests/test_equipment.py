"""Equipment tests + tenant isolation."""


def _create_eq(client, token, auth, name="クレーン"):
    return client.post(
        "/api/equipment",
        json={"name": name, "equipment_type": "crane"},
        headers=auth(token),
    )


def test_list_equipment_empty(client, admin_a_token, auth):
    r = client.get("/api/equipment", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_equipment(client, admin_a_token, auth):
    r = _create_eq(client, admin_a_token, auth, "クローラークレーン")
    assert r.status_code == 200
    assert r.json()["name"] == "クローラークレーン"


def test_get_equipment(client, admin_a_token, auth):
    e = _create_eq(client, admin_a_token, auth).json()
    r = client.get(f"/api/equipment/{e['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_update_equipment(client, admin_a_token, auth):
    e = _create_eq(client, admin_a_token, auth).json()
    r = client.put(
        f"/api/equipment/{e['id']}",
        json={"name": "改名"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["name"] == "改名"


def test_equipment_isolated_per_tenant(client, admin_a_token, admin_b_token, auth):
    _create_eq(client, admin_a_token, auth, "A-Eq")
    _create_eq(client, admin_b_token, auth, "B-Eq")
    r = client.get("/api/equipment", headers=auth(admin_a_token))
    names = [e["name"] for e in r.json()]
    assert names == ["A-Eq"]


def test_cannot_get_other_tenant_equipment(client, admin_a_token, admin_b_token, auth):
    e_b = _create_eq(client, admin_b_token, auth).json()
    r = client.get(f"/api/equipment/{e_b['id']}", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_equipment_unauthenticated(client):
    r = client.get("/api/equipment")
    assert r.status_code in (401, 403)
