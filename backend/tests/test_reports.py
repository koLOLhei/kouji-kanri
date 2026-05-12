"""Report (報告書) tests."""

from io import BytesIO


def test_list_reports_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/reports", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_upload_report_pdf(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    pdf = b"%PDF-1.4\n%test\n"
    r = client.post(
        f"/api/projects/{p.id}/reports",
        files={"file": ("report.pdf", BytesIO(pdf), "application/pdf")},
        data={"title": "検査報告書", "report_type": "inspection"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["title"] == "検査報告書"


def test_review_report_approve(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    pdf = b"%PDF-1.4\n%test\n"
    rep = client.post(
        f"/api/projects/{p.id}/reports",
        files={"file": ("r.pdf", BytesIO(pdf), "application/pdf")},
        data={"title": "T", "report_type": "inspection"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/reports/{rep['id']}/review?action=approve",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "approved"


def test_review_report_reject(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    pdf = b"%PDF-1.4\n%test\n"
    rep = client.post(
        f"/api/projects/{p.id}/reports",
        files={"file": ("r.pdf", BytesIO(pdf), "application/pdf")},
        data={"title": "T", "report_type": "inspection"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/reports/{rep['id']}/review?action=reject",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


def test_review_invalid_action_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    pdf = b"%PDF-1.4\n%test\n"
    rep = client.post(
        f"/api/projects/{p.id}/reports",
        files={"file": ("r.pdf", BytesIO(pdf), "application/pdf")},
        data={"title": "T", "report_type": "inspection"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/reports/{rep['id']}/review?action=invalid",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 400


def test_reports_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/reports", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_reports_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/reports")
    assert r.status_code in (401, 403)
