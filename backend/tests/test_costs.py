"""Cost (budget/actual/forecast) management tests."""


def test_list_budgets_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/costs/budgets", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_budget(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/costs/budgets",
        json={"category": "labor", "subcategory": "鉄筋工", "budgeted_amount": 1000000},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["budgeted_amount"] == 1000000


def test_negative_budget_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/costs/budgets",
        json={"category": "labor", "budgeted_amount": -100},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 422


def test_create_actual(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/costs/actuals",
        json={
            "category": "material",
            "amount": 500000,
            "expense_date": "2026-04-15",
            "vendor_name": "業者X",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["amount"] == 500000


def test_negative_actual_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/costs/actuals",
        json={"category": "material", "amount": -1},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 422


def test_update_actual(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    a = client.post(
        f"/api/projects/{p.id}/costs/actuals",
        json={"category": "x", "amount": 100},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/costs/actuals/{a['id']}",
        json={"amount": 200, "vendor_name": "更新先"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["amount"] == 200


def test_cost_summary_endpoint(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/costs/cost-summary", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_costs_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/costs/budgets", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_costs_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/costs/budgets")
    assert r.status_code in (401, 403)


def test_pending_approvals_endpoint(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/costs/pending-approvals", headers=auth(admin_a_token))
    assert r.status_code == 200
