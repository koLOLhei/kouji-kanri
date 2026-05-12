"""Onboarding (初期設定ウィザード) tests."""


def test_onboarding_status(client, admin_a_token, auth):
    r = client.get("/api/onboarding/status", headers=auth(admin_a_token))
    assert r.status_code == 200
    body = r.json()
    assert "completion_percent" in body
    assert "next_step" in body


def test_onboarding_skip(client, admin_a_token, auth):
    r = client.post("/api/onboarding/skip", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["onboarding_completed"] is True


def test_onboarding_after_skip_returns_complete(client, admin_a_token, auth):
    client.post("/api/onboarding/skip", headers=auth(admin_a_token))
    r = client.get("/api/onboarding/status", headers=auth(admin_a_token))
    assert r.json()["completion_percent"] == 100


def test_onboarding_unauthenticated(client):
    r = client.get("/api/onboarding/status")
    assert r.status_code in (401, 403)
