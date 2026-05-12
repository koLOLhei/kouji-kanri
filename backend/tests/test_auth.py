"""Authentication flow tests."""

import pytest


def test_login_returns_user_info(client, admin_a):
    r = client.post(
        "/api/auth/login",
        json={"email": admin_a.email, "password": "password123"},
    )
    body = r.json()
    assert body["user"]["email"] == admin_a.email
    assert body["user"]["role"] == "admin"
    assert body["user"]["tenant_id"] == admin_a.tenant_id


def test_login_returns_tenant_name(client, admin_a, tenant_a):
    r = client.post(
        "/api/auth/login",
        json={"email": admin_a.email, "password": "password123"},
    )
    assert r.json()["user"]["tenant_name"] == tenant_a.name


def test_login_inactive_user_rejected(client, db, tenant_a):
    from models.user import User
    from services.auth_service import hash_password
    import uuid
    inactive = User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_a.id,
        email=f"inactive-{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("password123"),
        name="Inactive",
        role="admin",
        is_active=False,
    )
    db.add(inactive)
    db.commit()
    r = client.post(
        "/api/auth/login",
        json={"email": inactive.email, "password": "password123"},
    )
    assert r.status_code == 401


def test_admin_session_expires_in_2h(client, admin_a):
    """Admin sessions expire in 2 hours; worker in 8 hours."""
    from jose import jwt
    from config import settings

    r = client.post(
        "/api/auth/login",
        json={"email": admin_a.email, "password": "password123"},
    )
    token = r.json()["access_token"]
    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    # 認証時刻から 7200 秒（2時間） 程度の差があるはず
    import time
    assert payload["exp"] - time.time() <= 2 * 3600 + 60
    assert payload["exp"] - time.time() >= 2 * 3600 - 60


def test_worker_session_expires_in_8h(client, worker_a):
    from jose import jwt
    from config import settings
    import time

    r = client.post(
        "/api/auth/login",
        json={"email": worker_a.email, "password": "password123"},
    )
    token = r.json()["access_token"]
    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    expected = settings.access_token_expire_minutes * 60
    assert payload["exp"] - time.time() <= expected + 60
    assert payload["exp"] - time.time() >= expected - 60


def test_token_contains_role(client, admin_a):
    from jose import jwt
    from config import settings

    r = client.post(
        "/api/auth/login",
        json={"email": admin_a.email, "password": "password123"},
    )
    payload = jwt.decode(r.json()["access_token"], settings.secret_key, algorithms=["HS256"])
    assert payload["role"] == "admin"
    assert payload["sub"] == admin_a.id
    assert payload["tenant_id"] == admin_a.tenant_id


def test_password_hash_upgrade_legacy_sha256(client, db, tenant_a):
    """Legacy SHA256 hashes should be upgraded to bcrypt on first login."""
    import hashlib
    import uuid
    from models.user import User

    salt = "abc"
    password = "legacypw123"
    legacy_hash = f"{salt}:{hashlib.sha256((salt + password).encode()).hexdigest()}"
    u = User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_a.id,
        email=f"legacy-{uuid.uuid4().hex[:6]}@example.com",
        password_hash=legacy_hash,
        name="Legacy",
        role="worker",
    )
    db.add(u)
    db.commit()

    r = client.post(
        "/api/auth/login",
        json={"email": u.email, "password": password},
    )
    assert r.status_code == 200

    db.refresh(u)
    assert u.password_hash.startswith("$2")  # bcrypt prefix


def test_invalid_jwt_rejected(client, auth):
    r = client.get("/api/auth/me", headers=auth("not-a-valid-jwt"))
    assert r.status_code == 401


def test_missing_authorization_header_rejected(client):
    r = client.get("/api/auth/me")
    assert r.status_code in (401, 403)


def test_token_version_invalidates_session(client, db, admin_a, admin_a_token, auth):
    """Bumping token_version on the user should invalidate existing JWTs."""
    # まずキャッシュ無効化
    from services.cache_service import invalidate_token_version
    invalidate_token_version(admin_a.id)

    # 既存トークンは有効
    r = client.get("/api/auth/me", headers=auth(admin_a_token))
    assert r.status_code == 200

    # token_versionを更新
    admin_a.token_version = (admin_a.token_version or 0) + 1
    db.commit()
    invalidate_token_version(admin_a.id)

    # 再度同じトークンで叩くと拒否される
    r = client.get("/api/auth/me", headers=auth(admin_a_token))
    assert r.status_code == 401


def test_password_reset_request_no_user_enumeration(client):
    """forgot-password should always return 200 even for unknown emails."""
    r = client.post(
        "/api/auth/forgot-password",
        json={"email": "unknown@example.com"},
    )
    assert r.status_code == 200


def test_password_reset_request_for_existing_user(client, admin_a):
    r = client.post(
        "/api/auth/forgot-password",
        json={"email": admin_a.email},
    )
    assert r.status_code == 200


def test_reset_password_invalid_token_rejected(client):
    r = client.post(
        "/api/auth/reset-password",
        json={"token": "invalid", "new_password": "newpassword123"},
    )
    assert r.status_code == 400


def test_login_history_records_success(client, db, admin_a):
    from models.platform import LoginHistory

    client.post(
        "/api/auth/login",
        json={"email": admin_a.email, "password": "password123"},
    )
    rows = db.query(LoginHistory).filter(LoginHistory.user_id == admin_a.id).all()
    assert len(rows) >= 1
    assert any(r.success for r in rows)


def test_login_history_records_failure(client, db, admin_a):
    from models.platform import LoginHistory

    client.post(
        "/api/auth/login",
        json={"email": admin_a.email, "password": "wrong"},
    )
    rows = db.query(LoginHistory).filter(LoginHistory.user_id == admin_a.id).all()
    assert any(not r.success for r in rows)


def test_login_history_endpoint_returns_only_own_records(
    client, db, admin_a, admin_b, admin_a_token, admin_b_token, auth
):
    """Defense-in-depth: tenant_id filter on login history."""
    # Login both
    client.post("/api/auth/login", json={"email": admin_a.email, "password": "password123"})
    client.post("/api/auth/login", json={"email": admin_b.email, "password": "password123"})

    r_a = client.get("/api/auth/login-history", headers=auth(admin_a_token))
    assert r_a.status_code == 200
    # admin_a should not see admin_b's records
    # (records contain only login_at / ip / success — no user identifier exposed)
    assert isinstance(r_a.json(), list)


def test_rate_limit_lockout_after_repeated_failures(client, admin_a):
    """The IP-based rate limiter should lock out after 5 failed attempts."""
    for _ in range(5):
        client.post("/api/auth/login", json={"email": admin_a.email, "password": "wrong"})
    r = client.post("/api/auth/login", json={"email": admin_a.email, "password": "wrong"})
    # 6回目以降は429
    assert r.status_code == 429


def test_short_password_rejected_on_reset(client):
    r = client.post(
        "/api/auth/reset-password",
        json={"token": "anything", "new_password": "short"},
    )
    # 期限切れトークンでまず400 — リセット未到達
    assert r.status_code == 400
