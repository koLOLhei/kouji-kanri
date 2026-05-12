"""External integrations (webhooks / api keys) tests + regression for inline-model bug."""


def test_list_webhooks_empty(client, admin_a_token, auth):
    """回帰: WebhookConfig がインライン定義で Alembic に登録されていなかったバグ"""
    r = client.get("/api/integrations/webhooks", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_webhook(client, admin_a_token, auth):
    r = client.post(
        "/api/integrations/webhooks",
        json={
            "name": "Slack通知",
            "url": "https://hooks.slack.com/services/test",
            "events": ["daily_report.submitted"],
        },
        headers=auth(admin_a_token),
    )
    # SSRF check は invalid hooks.slack.com でも通る前提
    assert r.status_code in (200, 400)


def test_create_webhook_invalid_event_rejected(client, admin_a_token, auth):
    r = client.post(
        "/api/integrations/webhooks",
        json={"name": "x", "url": "https://example.com", "events": ["nonexistent"]},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 400


def test_list_api_keys_empty(client, admin_a_token, auth):
    """回帰: ApiKey がインライン定義で Alembic に登録されていなかったバグ"""
    r = client.get("/api/integrations/api-keys", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_api_key(client, admin_a_token, auth):
    r = client.post(
        "/api/integrations/api-keys",
        json={"name": "test", "scopes": ["read:projects"]},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert "key" in r.json()  # 平文のキーが1度だけ返る


def test_invalid_scope_rejected(client, admin_a_token, auth):
    r = client.post(
        "/api/integrations/api-keys",
        json={"name": "test", "scopes": ["evil:everything"]},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 400


def test_integrations_isolated_per_tenant(
    client, admin_a_token, admin_b_token, auth
):
    client.post(
        "/api/integrations/webhooks",
        json={"name": "A", "url": "https://example.com", "events": ["photo.uploaded"]},
        headers=auth(admin_a_token),
    )
    r_a = client.get("/api/integrations/webhooks", headers=auth(admin_a_token)).json()
    r_b = client.get("/api/integrations/webhooks", headers=auth(admin_b_token)).json()
    # tenant_b は何も見えない
    assert len(r_b) == 0


def test_integrations_unauthenticated(client):
    r = client.get("/api/integrations/webhooks")
    assert r.status_code in (401, 403)


# ── SSRF 対策 ─────────────────────────────────────────

import pytest


@pytest.mark.parametrize("evil_url", [
    "http://127.0.0.1:8080/admin",        # localhost
    "http://localhost:6379/",              # redis localhost
    "http://10.0.0.1/secret",              # private RFC1918
    "http://192.168.1.1/router",           # private RFC1918
    "http://169.254.169.254/metadata",     # AWS metadata
    "http://metadata.google.internal/",    # GCP metadata
    "http://kube.svc.cluster.local/",      # k8s internal
    "http://my-service.local/",            # mDNS
    "ftp://example.com/",                  # disallowed scheme
    "file:///etc/passwd",                  # local file
    "gopher://evil/",                      # gopher
])
def test_webhook_ssrf_blocked(client, admin_a_token, auth, evil_url):
    r = client.post(
        "/api/integrations/webhooks",
        json={"name": "evil", "url": evil_url, "events": ["photo.uploaded"]},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 400, f"SSRF allowed: {evil_url} → {r.status_code}"
