"""資金繰り予測・インボイス多税率・出面労務原価のテスト。"""
from datetime import date, timedelta


# ── ② 資金繰り予測 ──
def test_cashflow_forecast(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.business_docs import PaymentNotice
    p = project_factory(tenant_a.id)
    # 入金予定: 今月期限の請求（税込110万）
    client.post(
        f"/api/projects/{p.id}/invoices/deposit",
        json={"amount": 1_000_000, "tax_rate": 10, "due_date": date.today().isoformat()},
        headers=auth(admin_a_token),
    )
    # 支払予定: 今月の未払支払通知 50万
    db.add(PaymentNotice(
        tenant_id=tenant_a.id, project_id=p.id, subcontractor_id="sub-1",
        total=500_000, payment_date=date.today(), status="draft",
    ))
    db.commit()
    r = client.get("/api/cashflow/forecast?months=3", headers=auth(admin_a_token))
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["rows"]) == 3
    m0 = d["rows"][0]
    assert m0["inflow"] == 1_100_000
    assert m0["outflow"] == 500_000
    assert m0["net"] == 600_000
    assert m0["cumulative"] == 600_000


def test_cashflow_tenant_isolation(client, admin_b_token, auth):
    r = client.get("/api/cashflow/forecast", headers=auth(admin_b_token))
    assert r.status_code == 200
    assert r.json()["total_inflow"] == 0  # 別テナントには他社のデータが出ない


# ── ③ インボイス多税率 ──
def test_invoice_tax_breakdown_mixed_rates(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    inv = client.post(
        f"/api/projects/{p.id}/invoices/additional",
        json={
            "title": "混在税率",
            "tax_rate": 10,
            "items": [
                {"name": "工事", "amount": 100000, "tax_rate": 10},
                {"name": "茶菓(軽減)", "amount": 10000, "tax_rate": 8},
            ],
        },
        headers=auth(admin_a_token),
    ).json()
    # 請求書本体の税額も税率別の合計(10000+800)になっている
    assert inv["subtotal"] == 110000
    assert inv["tax_amount"] == 10800
    assert inv["total"] == 120800
    # 税率別区分
    r = client.get(f"/api/projects/{p.id}/invoices/{inv['id']}/tax-breakdown", headers=auth(admin_a_token))
    assert r.status_code == 200, r.text
    d = r.json()
    rates = {b["tax_rate"]: b for b in d["breakdown"]}
    assert rates[10.0]["taxable_amount"] == 100000 and rates[10.0]["tax_amount"] == 10000
    assert rates[8.0]["taxable_amount"] == 10000 and rates[8.0]["tax_amount"] == 800
    assert d["total_tax"] == 10800


# ── ④ 出面→労務原価 ──
def test_labor_cost_summary_and_post(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.worker import Worker, Attendance
    p = project_factory(tenant_a.id)
    w = Worker(tenant_id=tenant_a.id, name="職人A", daily_wage=20000)
    db.add(w)
    db.commit()
    db.refresh(w)
    # 1日フル + 1日4h(=0.5人工)
    db.add(Attendance(project_id=p.id, worker_id=w.id, work_date=date.today(), tenant_id=tenant_a.id))
    db.add(Attendance(project_id=p.id, worker_id=w.id, work_date=date.today() - timedelta(days=1), work_hours=4.0, tenant_id=tenant_a.id))
    db.commit()

    r = client.get(f"/api/projects/{p.id}/labor-cost", headers=auth(admin_a_token))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["total_man_days"] == 1.5
    assert d["total_cost"] == 30000  # 20000*1.0 + 20000*0.5
    assert d["workers"][0]["worker_name"] == "職人A"

    # 原価へ計上
    post = client.post(f"/api/projects/{p.id}/labor-cost/post-to-cost", json={}, headers=auth(admin_a_token))
    assert post.status_code == 201, post.text
    assert post.json()["amount"] == 30000


def test_additional_invoice_subtotal_matches_items(client, admin_a_token, auth, project_factory, tenant_a):
    """明細があるとき小計は明細合計に一致（body.total の不整合値は無視）→ 税額も整合。"""
    p = project_factory(tenant_a.id)
    inv = client.post(
        f"/api/projects/{p.id}/invoices/additional",
        json={"title": "x", "tax_rate": 10, "total": 999999,
              "items": [{"name": "a", "amount": 50000}, {"name": "b", "amount": 30000}]},
        headers=auth(admin_a_token),
    ).json()
    assert inv["subtotal"] == 80000   # 明細合計（999999は無視）
    assert inv["tax_amount"] == 8000  # 80000 * 10%
    assert inv["total"] == 88000


def test_labor_post_to_cost_idempotent(client, admin_a_token, auth, project_factory, tenant_a, db):
    """post-to-cost を複数回呼んでも出面労務費は重複計上されない。"""
    from models.worker import Worker, Attendance
    from models.cost import CostActual
    p = project_factory(tenant_a.id)
    w = Worker(tenant_id=tenant_a.id, name="A", daily_wage=10000)
    db.add(w)
    db.commit()
    db.refresh(w)
    db.add(Attendance(project_id=p.id, worker_id=w.id, work_date=date.today(), tenant_id=tenant_a.id))
    db.commit()
    client.post(f"/api/projects/{p.id}/labor-cost/post-to-cost", json={}, headers=auth(admin_a_token))
    client.post(f"/api/projects/{p.id}/labor-cost/post-to-cost", json={}, headers=auth(admin_a_token))
    db.rollback()  # clientのcommitを新トランザクションで参照
    n = (
        db.query(CostActual)
        .filter(CostActual.project_id == p.id, CostActual.category == "労務費", CostActual.subcategory == "出面")
        .count()
    )
    assert n == 1


def test_labor_cost_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/labor-cost", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["total_cost"] == 0
    # 計上対象なしは400
    post = client.post(f"/api/projects/{p.id}/labor-cost/post-to-cost", json={}, headers=auth(admin_a_token))
    assert post.status_code == 400
