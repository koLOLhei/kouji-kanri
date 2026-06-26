"""請求書(追加/最終)ルート＋見積番号 採番の回帰テスト。"""


def test_additional_invoice(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, contract_amount=10_000_000)
    r = client.post(
        f"/api/projects/{p.id}/invoices/additional",
        json={
            "title": "追加工事A",
            "items": [{"name": "手すり追加", "amount": 200000}],
            "total": 200000,
            "tax_rate": 10,
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["kind"] == "additional"
    assert d["subtotal"] == 200000
    assert d["total"] == 220000  # +10%


def test_final_invoice_remaining(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, contract_amount=10_000_000)
    # 着手金300万を先に請求
    client.post(
        f"/api/projects/{p.id}/invoices/deposit",
        json={"amount": 3_000_000, "tax_rate": 10},
        headers=auth(admin_a_token),
    )
    r = client.post(
        f"/api/projects/{p.id}/invoices/final",
        json={"note": "工事完了"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["kind"] == "final"
    assert d["subtotal"] == 7_000_000  # 1000万 - 300万(税抜小計)
    assert d["total"] == 7_700_000


def test_final_invoice_not_negative(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, contract_amount=1_000_000)
    client.post(
        f"/api/projects/{p.id}/invoices/deposit",
        json={"amount": 2_000_000, "tax_rate": 10},
        headers=auth(admin_a_token),
    )
    r = client.post(
        f"/api/projects/{p.id}/invoices/final",
        json={"note": ""},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 201
    assert r.json()["subtotal"] == 0  # 既請求が請負額を超えてもマイナスにしない


def test_update_invoice_null_subtotal_no_500(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, contract_amount=5_000_000)
    inv = client.post(
        f"/api/projects/{p.id}/invoices/deposit",
        json={"amount": 1_000_000, "tax_rate": 10},
        headers=auth(admin_a_token),
    ).json()
    # subtotal:null を送っても 500 にならない
    r = client.put(
        f"/api/projects/{p.id}/invoices/{inv['id']}",
        json={"subtotal": None, "status": "sent"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200, r.text


def test_estimate_number_sequential(client, admin_a_token, auth):
    def make():
        return client.post(
            "/api/estimates",
            json={"project_name": "X", "items": [{"name": "a", "quantity": 1, "unit_price": 1000}], "tax_rate": 10},
            headers=auth(admin_a_token),
        ).json()

    e1, e2, e3 = make(), make(), make()
    nums = {e1["estimate_number"], e2["estimate_number"], e3["estimate_number"]}
    assert len(nums) == 3  # 重複しない
    assert e3["estimate_number"].endswith("003")  # max+1 で連番
