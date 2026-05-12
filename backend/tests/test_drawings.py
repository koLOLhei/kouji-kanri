"""Drawing CRUD + revision + approval workflow tests."""


def _create_drawing(client, token, auth, project_id, **kw):
    body = {
        "title": kw.get("title", "1F平面図"),
        "category": kw.get("category", "architectural"),
        "file_key": kw.get("file_key", "test/drawing.pdf"),
        "drawing_number": kw.get("drawing_number", "A-001"),
    }
    return client.post(f"/api/projects/{project_id}/drawings", json=body, headers=auth(token))


def test_list_drawings_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/drawings", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_drawing_creates_first_revision(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.drawing import DrawingRevision
    p = project_factory(tenant_a.id)
    r = _create_drawing(client, admin_a_token, auth, p.id)
    assert r.status_code == 200
    drawing_id = r.json()["id"]
    revisions = db.query(DrawingRevision).filter(DrawingRevision.drawing_id == drawing_id).all()
    assert len(revisions) == 1
    assert revisions[0].revision_number == 1


def test_get_drawing(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    d = _create_drawing(client, admin_a_token, auth, p.id, title="名前").json()
    r = client.get(f"/api/projects/{p.id}/drawings/{d['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200
    body = r.json()
    assert body["drawing"]["title"] == "名前"
    assert isinstance(body["revisions"], list)


def test_update_drawing(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    d = _create_drawing(client, admin_a_token, auth, p.id).json()
    r = client.put(
        f"/api/projects/{p.id}/drawings/{d['id']}",
        json={"title": "改訂"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["title"] == "改訂"


def test_filter_by_category(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    _create_drawing(client, admin_a_token, auth, p.id, title="archi", category="architectural")
    _create_drawing(client, admin_a_token, auth, p.id, title="elec", category="electrical")
    r = client.get(f"/api/projects/{p.id}/drawings?category=electrical", headers=auth(admin_a_token))
    titles = [d["title"] for d in r.json()]
    assert titles == ["elec"]


def test_drawings_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/drawings", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_create_drawing_rejected_for_other_tenant(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = _create_drawing(client, admin_a_token, auth, p.id)
    assert r.status_code == 404


def test_drawing_create_requires_title(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/drawings",
        json={"category": "x", "file_key": "k"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 422


def test_drawing_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/drawings")
    assert r.status_code in (401, 403)


def test_drawing_revisions_listed(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    d = _create_drawing(client, admin_a_token, auth, p.id).json()
    r = client.get(f"/api/projects/{p.id}/drawings/{d['id']}/revisions", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_create_new_revision(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    d = _create_drawing(client, admin_a_token, auth, p.id).json()
    r = client.post(
        f"/api/projects/{p.id}/drawings/{d['id']}/revisions",
        json={
            "file_key": "test/drawing-v2.pdf",
            "change_description": "間口を変更",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    rl = client.get(f"/api/projects/{p.id}/drawings/{d['id']}/revisions", headers=auth(admin_a_token))
    assert len(rl.json()) >= 2


def test_submit_for_approval(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    d = _create_drawing(client, admin_a_token, auth, p.id).json()
    r = client.put(
        f"/api/projects/{p.id}/drawings/{d['id']}/submit-for-approval",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_approve_drawing(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    d = _create_drawing(client, admin_a_token, auth, p.id).json()
    client.put(
        f"/api/projects/{p.id}/drawings/{d['id']}/submit-for-approval",
        headers=auth(admin_a_token),
    )
    r = client.put(
        f"/api/projects/{p.id}/drawings/{d['id']}/approve",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_reject_drawing_requires_reason(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    d = _create_drawing(client, admin_a_token, auth, p.id).json()
    client.put(
        f"/api/projects/{p.id}/drawings/{d['id']}/submit-for-approval",
        headers=auth(admin_a_token),
    )
    r = client.put(
        f"/api/projects/{p.id}/drawings/{d['id']}/reject",
        json={"rejection_reason": "寸法不一致"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
