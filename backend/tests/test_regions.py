"""Regional override tests."""


def test_list_supported_regions(client):
    r = client.get("/api/regions")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert any(reg["code"] == "default" for reg in body)


def test_list_overrides_empty(client, admin_a_token, auth):
    r = client.get("/api/regions/tokyo/overrides", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_admin_can_create_override(client, super_admin_token, auth):
    r = client.post(
        "/api/regions/tokyo/overrides",
        json={
            "region": "tokyo",
            "override_type": "add_requirement",
            "data": {"requirement": "東京都条例添付"},
        },
        headers=auth(super_admin_token),
    )
    assert r.status_code == 200


def test_worker_cannot_create_override(client, worker_a_token, auth):
    r = client.post(
        "/api/regions/tokyo/overrides",
        json={
            "region": "tokyo",
            "override_type": "add_requirement",
            "data": {},
        },
        headers=auth(worker_a_token),
    )
    assert r.status_code == 403


def test_overrides_unauthenticated_listing(client):
    r = client.get("/api/regions/tokyo/overrides")
    assert r.status_code in (401, 403)
