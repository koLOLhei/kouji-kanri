"""Health and basic auth smoke tests."""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_success(client, admin_a):
    r = client.post(
        "/api/auth/login",
        json={"email": admin_a.email, "password": "password123"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client, admin_a):
    r = client.post(
        "/api/auth/login",
        json={"email": admin_a.email, "password": "wrong"},
    )
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "anything"},
    )
    assert r.status_code == 401


def test_projects_requires_auth(client):
    r = client.get("/api/projects")
    assert r.status_code in (401, 403)


def test_me_returns_user_info(client, admin_a, admin_a_token, auth):
    r = client.get("/api/auth/me", headers=auth(admin_a_token))
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == admin_a.email
    assert body["role"] == "admin"
    assert body["tenant_id"] == admin_a.tenant_id


def test_me_rejects_invalid_token(client, auth):
    r = client.get("/api/auth/me", headers=auth("invalid.token.here"))
    assert r.status_code == 401
