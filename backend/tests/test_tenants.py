"""Tenant management (super_admin) tests."""

import uuid


def test_list_tenants_requires_super_admin(client, admin_a_token, auth):
    r = client.get("/api/tenants", headers=auth(admin_a_token))
    assert r.status_code == 403


def test_super_admin_can_list_tenants(client, super_admin_token, auth):
    r = client.get("/api/tenants", headers=auth(super_admin_token))
    assert r.status_code == 200


def test_super_admin_can_create_tenant(client, super_admin_token, auth):
    suffix = uuid.uuid4().hex[:6]
    r = client.post(
        "/api/tenants",
        json={
            "name": f"新規テナント-{suffix}",
            "slug": f"new-tenant-{suffix}",
            "plan": "standard",
            "max_projects": 5,
            "max_users": 10,
            "admin_email": f"admin-{suffix}@new.example",
            "admin_password": "newpassword123",
            "admin_name": "新規管理者",
        },
        headers=auth(super_admin_token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["plan"] == "standard"


def test_worker_cannot_create_tenant(client, worker_a_token, auth):
    r = client.post(
        "/api/tenants",
        json={
            "name": "侵入",
            "slug": "x",
            "admin_email": "x@x.com",
            "admin_password": "password123",
            "admin_name": "x",
        },
        headers=auth(worker_a_token),
    )
    assert r.status_code == 403


def test_list_plans(client, super_admin_token, auth):
    r = client.get("/api/tenants/plans", headers=auth(super_admin_token))
    assert r.status_code == 200
    plans = r.json()
    assert len(plans) >= 2  # free, standard, enterprise
    codes = [p["code"] for p in plans]
    assert "free" in codes


def test_super_admin_can_view_tenant(client, super_admin_token, tenant_b, auth):
    r = client.get(f"/api/tenants/{tenant_b.id}", headers=auth(super_admin_token))
    assert r.status_code == 200


def test_super_admin_can_update_tenant(client, super_admin_token, tenant_b, auth):
    r = client.put(
        f"/api/tenants/{tenant_b.id}",
        json={"max_projects": 999},
        headers=auth(super_admin_token),
    )
    assert r.status_code == 200
    assert r.json()["max_projects"] == 999


def test_admin_cannot_update_tenant(client, admin_a_token, tenant_b, auth):
    r = client.put(
        f"/api/tenants/{tenant_b.id}",
        json={"max_projects": 1},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 403


def test_tenant_users_listing(client, super_admin_token, tenant_a, admin_a, auth):
    r = client.get(f"/api/tenants/{tenant_a.id}/users", headers=auth(super_admin_token))
    assert r.status_code == 200
    emails = [u["email"] for u in r.json()]
    assert admin_a.email in emails


def test_tenants_unauthenticated(client):
    r = client.get("/api/tenants")
    assert r.status_code in (401, 403)
