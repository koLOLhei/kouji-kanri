"""Facility / Zone / Element / InspectionLog tests + tenant isolation."""


def _create_facility(client, token, auth, name="ビルA"):
    return client.post(
        "/api/facilities",
        json={"name": name, "address": "東京都"},
        headers=auth(token),
    )


def test_list_facilities_empty(client, admin_a_token, auth):
    r = client.get("/api/facilities", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_facility(client, admin_a_token, auth):
    r = _create_facility(client, admin_a_token, auth, "本社ビル")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "本社ビル"


def test_get_facility(client, admin_a_token, auth):
    f = _create_facility(client, admin_a_token, auth).json()
    r = client.get(f"/api/facilities/{f['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_facilities_isolated_per_tenant(client, admin_a_token, admin_b_token, auth):
    _create_facility(client, admin_a_token, auth, "TenantA-Bldg")
    _create_facility(client, admin_b_token, auth, "TenantB-Bldg")
    r = client.get("/api/facilities", headers=auth(admin_a_token))
    names = [f["name"] for f in r.json()]
    assert names == ["TenantA-Bldg"]


def test_cannot_get_other_tenant_facility(client, admin_a_token, admin_b_token, auth):
    f_b = _create_facility(client, admin_b_token, auth).json()
    r = client.get(f"/api/facilities/{f_b['id']}", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_list_zones_of_other_tenant(client, admin_a_token, admin_b_token, auth):
    """重要: facility_id だけでなく tenant_id も検証されているか。"""
    f_b = _create_facility(client, admin_b_token, auth).json()
    r = client.get(f"/api/facilities/{f_b['id']}/zones", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_create_zone_in_other_tenant(client, admin_a_token, admin_b_token, auth):
    f_b = _create_facility(client, admin_b_token, auth).json()
    r = client.post(
        f"/api/facilities/{f_b['id']}/zones",
        json={"name": "侵入", "zone_type": "floor"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_cannot_list_elements_of_other_tenant(client, admin_a_token, admin_b_token, auth):
    f_b = _create_facility(client, admin_b_token, auth).json()
    r = client.get(f"/api/facilities/{f_b['id']}/elements", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_create_element_in_other_tenant(client, admin_a_token, admin_b_token, auth):
    f_b = _create_facility(client, admin_b_token, auth).json()
    r = client.post(
        f"/api/facilities/{f_b['id']}/elements",
        json={"category": "electrical", "element_type": "panel", "name": "侵入"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_cannot_list_logs_of_other_tenant(client, admin_a_token, admin_b_token, auth):
    f_b = _create_facility(client, admin_b_token, auth).json()
    r = client.get(f"/api/facilities/{f_b['id']}/logs", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_create_zone_for_own_facility(client, admin_a_token, auth):
    f = _create_facility(client, admin_a_token, auth).json()
    r = client.post(
        f"/api/facilities/{f['id']}/zones",
        json={"name": "1F", "zone_type": "floor"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_create_element_for_own_facility(client, admin_a_token, auth):
    f = _create_facility(client, admin_a_token, auth).json()
    r = client.post(
        f"/api/facilities/{f['id']}/elements",
        json={"category": "electrical", "element_type": "panel", "name": "分電盤"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_facilities_unauthenticated(client):
    r = client.get("/api/facilities")
    assert r.status_code in (401, 403)


def test_facility_stats_endpoint(client, admin_a_token, auth):
    r = client.get("/api/facility-stats", headers=auth(admin_a_token))
    assert r.status_code == 200
    body = r.json()
    assert "total_facilities" in body


def test_create_facility_requires_name(client, admin_a_token, auth):
    r = client.post("/api/facilities", json={}, headers=auth(admin_a_token))
    assert r.status_code == 422
