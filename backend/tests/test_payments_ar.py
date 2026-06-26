"""入金消込・売掛(AR)管理のテスト。"""
from datetime import date, timedelta


def _make_invoice(client, auth, token, project_id, amount=1_000_000, due_offset_days=0):
    due = (date.today() + timedelta(days=due_offset_days)).isoformat()
    return client.post(
        f"/api/projects/{project_id}/invoices/deposit",
        json={"amount": amount, "tax_rate": 10, "due_date": due},
        headers=auth(token),
    ).json()


def test_full_payment_marks_paid(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, contract_amount=5_000_000)
    inv = _make_invoice(client, auth, admin_a_token, p.id, amount=1_000_000)  # total=1,100,000
    r = client.post(
        f"/api/projects/{p.id}/payments",
        json={"invoice_id": inv["id"], "amount": inv["total"]},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 201, r.text
    got = client.get(f"/api/projects/{p.id}/invoices/{inv['id']}", headers=auth(admin_a_token)).json()
    assert got["status"] == "paid"


def test_partial_payment_in_ar_aging(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, contract_amount=5_000_000)
    inv = _make_invoice(client, auth, admin_a_token, p.id, amount=1_000_000, due_offset_days=-45)
    client.post(
        f"/api/projects/{p.id}/payments",
        json={"invoice_id": inv["id"], "amount": 400_000},
        headers=auth(admin_a_token),
    )
    ar = client.get("/api/ar/aging", headers=auth(admin_a_token)).json()
    assert ar["count"] == 1
    row = ar["invoices"][0]
    assert row["balance"] == inv["total"] - 400_000
    assert row["bucket"] == "d31_60"  # 45日滞留
    assert ar["buckets"]["d31_60"] == inv["total"] - 400_000
    assert ar["total_ar"] == inv["total"] - 400_000


def test_paid_invoice_excluded_from_ar(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, contract_amount=5_000_000)
    inv = _make_invoice(client, auth, admin_a_token, p.id, amount=500_000)
    client.post(
        f"/api/projects/{p.id}/payments",
        json={"invoice_id": inv["id"], "amount": inv["total"]},
        headers=auth(admin_a_token),
    )
    ar = client.get("/api/ar/aging", headers=auth(admin_a_token)).json()
    assert all(r["invoice_id"] != inv["id"] for r in ar["invoices"])


def test_delete_payment_reverts_status(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, contract_amount=5_000_000)
    inv = _make_invoice(client, auth, admin_a_token, p.id, amount=500_000)
    pay = client.post(
        f"/api/projects/{p.id}/payments",
        json={"invoice_id": inv["id"], "amount": inv["total"]},
        headers=auth(admin_a_token),
    ).json()
    assert client.get(f"/api/projects/{p.id}/invoices/{inv['id']}", headers=auth(admin_a_token)).json()["status"] == "paid"
    client.delete(f"/api/projects/{p.id}/payments/{pay['id']}", headers=auth(admin_a_token))
    assert client.get(f"/api/projects/{p.id}/invoices/{inv['id']}", headers=auth(admin_a_token)).json()["status"] != "paid"


def test_unallocated_payment_reduces_net_ar(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    inv = _make_invoice(client, auth, admin_a_token, p.id, amount=1_000_000)  # 売掛 = total
    # 未充当入金（請求書に紐付けない前受）
    client.post(f"/api/projects/{p.id}/payments", json={"amount": 100_000}, headers=auth(admin_a_token))
    ar = client.get("/api/ar/aging", headers=auth(admin_a_token)).json()
    assert ar["total_ar"] == inv["total"]
    assert ar["unallocated"] == 100_000
    assert ar["net_ar"] == inv["total"] - 100_000


def test_ap_aging_and_settle(client, admin_a_token, admin_b_token, auth, project_factory, tenant_a, db):
    from models.business_docs import PaymentNotice
    p = project_factory(tenant_a.id)
    n = PaymentNotice(
        tenant_id=tenant_a.id, project_id=p.id, subcontractor_id="sub-1",
        total=300_000, payment_date=date.today() - timedelta(days=20), status="draft",
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    ap = client.get("/api/ap/aging", headers=auth(admin_a_token)).json()
    assert ap["total_ap"] == 300_000
    assert ap["count"] == 1
    assert ap["notices"][0]["bucket"] == "d1_30"
    # 別テナントには出ない
    assert client.get("/api/ap/aging", headers=auth(admin_b_token)).json()["count"] == 0
    # 支払消込 → APから消える
    r = client.post(f"/api/projects/{p.id}/payment-notices/{n.id}/settle", json={}, headers=auth(admin_a_token))
    assert r.status_code == 200
    assert client.get("/api/ap/aging", headers=auth(admin_a_token)).json()["count"] == 0


def test_tenant_isolation(client, admin_a_token, admin_b_token, auth, project_factory, tenant_a, tenant_b):
    pa = project_factory(tenant_a.id, contract_amount=1_000_000)
    inv = _make_invoice(client, auth, admin_a_token, pa.id, amount=500_000)
    client.post(
        f"/api/projects/{pa.id}/payments",
        json={"invoice_id": inv["id"], "amount": 100_000},
        headers=auth(admin_a_token),
    )
    # 別テナントは案件の入金一覧にアクセスできない
    assert client.get(f"/api/projects/{pa.id}/payments", headers=auth(admin_b_token)).status_code in (403, 404)
    # 別テナントのAR集計には出ない
    ar_b = client.get("/api/ar/aging", headers=auth(admin_b_token)).json()
    assert ar_b["count"] == 0
