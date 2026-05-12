"""Corrective Action (NCR) tests."""


def test_list_ncr_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/corrective-actions", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_ncr(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/corrective-actions",
        json={
            "title": "コンクリ表面のジャンカ",
            "severity": "major",
            "description": "B棟2F柱根本",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_get_ncr(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    ca = client.post(
        f"/api/projects/{p.id}/corrective-actions",
        json={"title": "T"},
        headers=auth(admin_a_token),
    ).json()
    r = client.get(
        f"/api/projects/{p.id}/corrective-actions/{ca['id']}",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_update_ncr(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    ca = client.post(
        f"/api/projects/{p.id}/corrective-actions",
        json={"title": "T"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/corrective-actions/{ca['id']}",
        json={"corrective_action": "再施工"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_verify_ncr(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    ca = client.post(
        f"/api/projects/{p.id}/corrective-actions",
        json={"title": "T"},
        headers=auth(admin_a_token),
    ).json()
    # まずstatus更新（in_progress）
    client.put(
        f"/api/projects/{p.id}/corrective-actions/{ca['id']}",
        json={"status": "in_progress"},
        headers=auth(admin_a_token),
    )
    r = client.put(
        f"/api/projects/{p.id}/corrective-actions/{ca['id']}/verify",
        json={"verification_result": "問題解消を確認"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_close_verified_ncr(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    ca = client.post(
        f"/api/projects/{p.id}/corrective-actions",
        json={"title": "T"},
        headers=auth(admin_a_token),
    ).json()
    client.put(
        f"/api/projects/{p.id}/corrective-actions/{ca['id']}",
        json={"status": "in_progress"},
        headers=auth(admin_a_token),
    )
    client.put(
        f"/api/projects/{p.id}/corrective-actions/{ca['id']}/verify",
        json={"verification_result": "OK"},
        headers=auth(admin_a_token),
    )
    r = client.put(
        f"/api/projects/{p.id}/corrective-actions/{ca['id']}/close",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_close_unverified_ncr_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    ca = client.post(
        f"/api/projects/{p.id}/corrective-actions",
        json={"title": "T"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/corrective-actions/{ca['id']}/close",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 400


def test_ncr_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/corrective-actions", headers=auth(admin_a_token))
    assert r.status_code == 404
