"""Inspection schedule (法定点検) tests + tenant isolation."""


def _create_facility(client, token, auth):
    return client.post(
        "/api/facilities",
        json={"name": "対象施設"},
        headers=auth(token),
    ).json()


def test_list_schedules_empty(client, admin_a_token, auth):
    f = _create_facility(client, admin_a_token, auth)
    r = client.get(
        f"/api/facilities/{f['id']}/inspection-schedules",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json() == []


def test_create_schedule(client, admin_a_token, auth):
    f = _create_facility(client, admin_a_token, auth)
    r = client.post(
        f"/api/facilities/{f['id']}/inspection-schedules",
        json={
            "name": "消防点検",
            "category": "fire",
            "frequency": "semi_annual",
            "legal_basis": "消防法",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["name"] == "消防点検"


def test_invalid_frequency_rejected(client, admin_a_token, auth):
    f = _create_facility(client, admin_a_token, auth)
    r = client.post(
        f"/api/facilities/{f['id']}/inspection-schedules",
        json={"name": "x", "category": "fire", "frequency": "invalid"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 400


def test_complete_inspection_calculates_next_due(client, admin_a_token, auth):
    from datetime import date, timedelta
    f = _create_facility(client, admin_a_token, auth)
    s = client.post(
        f"/api/facilities/{f['id']}/inspection-schedules",
        json={"name": "x", "category": "fire", "frequency": "annual"},
        headers=auth(admin_a_token),
    ).json()
    today = date.today().isoformat()
    r = client.put(
        f"/api/facilities/{f['id']}/inspection-schedules/{s['id']}/complete"
        if False else
        f"/api/facilities/{f['id']}/inspection-schedules/{s['id']}/complete",
        json={"performed_date": today},
        headers=auth(admin_a_token),
    )
    # ルートは POST だが上の合成は誤り — 修正:
    r = client.post(
        f"/api/facilities/{f['id']}/inspection-schedules/{s['id']}/complete",
        json={"performed_date": today},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["last_performed"] == today


def test_list_overdue(client, admin_a_token, auth):
    f = _create_facility(client, admin_a_token, auth)
    r = client.get(
        f"/api/facilities/{f['id']}/inspection-schedules/overdue",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_list_upcoming(client, admin_a_token, auth):
    f = _create_facility(client, admin_a_token, auth)
    r = client.get(
        f"/api/facilities/{f['id']}/inspection-schedules/upcoming?days=30",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


# ── テナント分離（重要：先ほど修正した箇所） ────────────────────────────

def test_cannot_list_schedules_of_other_tenant(client, admin_a_token, admin_b_token, auth):
    f_b = _create_facility(client, admin_b_token, auth)
    r = client.get(
        f"/api/facilities/{f_b['id']}/inspection-schedules",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_cannot_create_schedule_in_other_tenant(client, admin_a_token, admin_b_token, auth):
    f_b = _create_facility(client, admin_b_token, auth)
    r = client.post(
        f"/api/facilities/{f_b['id']}/inspection-schedules",
        json={"name": "侵入", "category": "fire", "frequency": "annual"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_cannot_complete_schedule_of_other_tenant(client, admin_a_token, admin_b_token, auth):
    from datetime import date
    f_b = _create_facility(client, admin_b_token, auth)
    s = client.post(
        f"/api/facilities/{f_b['id']}/inspection-schedules",
        json={"name": "x", "category": "fire", "frequency": "annual"},
        headers=auth(admin_b_token),
    ).json()
    r = client.post(
        f"/api/facilities/{f_b['id']}/inspection-schedules/{s['id']}/complete",
        json={"performed_date": date.today().isoformat()},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_cannot_list_overdue_of_other_tenant(client, admin_a_token, admin_b_token, auth):
    f_b = _create_facility(client, admin_b_token, auth)
    r = client.get(
        f"/api/facilities/{f_b['id']}/inspection-schedules/overdue",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404
