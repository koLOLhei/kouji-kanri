"""Worker / Qualification CRUD + tenant isolation tests."""

from datetime import date


def _create_worker(client, token, auth, name="作業員A"):
    return client.post(
        "/api/workers",
        json={"name": name},
        headers=auth(token),
    )


def test_list_workers_empty(client, admin_a_token, auth):
    r = client.get("/api/workers", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_worker(client, admin_a_token, auth):
    r = _create_worker(client, admin_a_token, auth, "山田太郎")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "山田太郎"
    assert body["is_active"] is True


def test_get_worker(client, admin_a_token, auth):
    created = _create_worker(client, admin_a_token, auth).json()
    r = client.get(f"/api/workers/{created['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


def test_update_worker(client, admin_a_token, auth):
    created = _create_worker(client, admin_a_token, auth, "原名").json()
    r = client.put(
        f"/api/workers/{created['id']}",
        json={"name": "改名", "blood_type": "A"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["name"] == "改名"
    assert r.json()["blood_type"] == "A"


def test_workers_isolated_between_tenants(
    client, admin_a_token, admin_b_token, auth
):
    _create_worker(client, admin_a_token, auth, "TenantA-Worker")
    _create_worker(client, admin_b_token, auth, "TenantB-Worker")

    list_a = client.get("/api/workers", headers=auth(admin_a_token)).json()
    list_b = client.get("/api/workers", headers=auth(admin_b_token)).json()

    assert [w["name"] for w in list_a] == ["TenantA-Worker"]
    assert [w["name"] for w in list_b] == ["TenantB-Worker"]


def test_cannot_get_worker_of_other_tenant(client, admin_a_token, admin_b_token, auth):
    created_b = _create_worker(client, admin_b_token, auth).json()
    r = client.get(f"/api/workers/{created_b['id']}", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_update_worker_of_other_tenant(client, admin_a_token, admin_b_token, auth):
    created_b = _create_worker(client, admin_b_token, auth).json()
    r = client.put(
        f"/api/workers/{created_b['id']}",
        json={"name": "侵入"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_filter_active_workers(client, admin_a_token, auth):
    w1 = _create_worker(client, admin_a_token, auth, "active1").json()
    w2 = _create_worker(client, admin_a_token, auth, "inactive1").json()
    client.put(
        f"/api/workers/{w2['id']}",
        json={"is_active": False},
        headers=auth(admin_a_token),
    )
    r = client.get("/api/workers?is_active=true", headers=auth(admin_a_token))
    names = [w["name"] for w in r.json()]
    assert "active1" in names
    assert "inactive1" not in names


def test_qualification_create_and_list(client, admin_a_token, auth):
    w = _create_worker(client, admin_a_token, auth).json()
    r = client.post(
        f"/api/workers/{w['id']}/qualifications",
        json={
            "qualification_name": "玉掛技能講習",
            "qualification_type": "skill",
            "expiry_date": "2030-01-01",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200

    rl = client.get(f"/api/workers/{w['id']}/qualifications", headers=auth(admin_a_token))
    assert rl.status_code == 200
    assert len(rl.json()) == 1
    assert rl.json()[0]["qualification_name"] == "玉掛技能講習"


def test_workers_unauthenticated(client):
    r = client.get("/api/workers")
    assert r.status_code in (401, 403)


def test_create_worker_requires_name(client, admin_a_token, auth):
    r = client.post("/api/workers", json={}, headers=auth(admin_a_token))
    assert r.status_code == 422


def test_attendance_negative_hours_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    w = _create_worker(client, admin_a_token, auth).json()
    r = client.post(
        f"/api/projects/{p.id}/attendance",
        json={
            "worker_id": w["id"],
            "work_date": "2026-05-04",
            "work_hours": -1,
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 422
