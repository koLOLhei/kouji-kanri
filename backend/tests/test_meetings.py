"""Meeting (打合せ記録) tests."""


def test_list_meetings_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/meetings", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_create_meeting(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/meetings",
        json={
            "meeting_date": "2026-05-04",
            "meeting_type": "regular",
            "title": "週例打合せ",
            "agenda": "進捗共有",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_get_meeting(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    m = client.post(
        f"/api/projects/{p.id}/meetings",
        json={"meeting_date": "2026-05-04", "meeting_type": "regular", "title": "T"},
        headers=auth(admin_a_token),
    ).json()
    r = client.get(f"/api/projects/{p.id}/meetings/{m['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_update_meeting(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    m = client.post(
        f"/api/projects/{p.id}/meetings",
        json={"meeting_date": "2026-05-04", "meeting_type": "regular", "title": "T"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/meetings/{m['id']}",
        json={"minutes": "議事録"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["minutes"] == "議事録"


def test_meetings_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/meetings", headers=auth(admin_a_token))
    assert r.status_code == 404
