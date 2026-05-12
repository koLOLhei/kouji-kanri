"""Comment tests + tenant isolation defense-in-depth."""


def _create_comment(client, token, auth, entity_id, entity_type="project"):
    return client.post(
        "/api/comments",
        json={
            "entity_type": entity_type,
            "entity_id": entity_id,
            "body": "テストコメント",
        },
        headers=auth(token),
    )


def test_create_comment(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = _create_comment(client, admin_a_token, auth, p.id)
    assert r.status_code in (200, 201)


def test_create_comment_on_other_tenant_project_rejected(
    client, admin_a_token, auth, project_factory, tenant_b
):
    p_b = project_factory(tenant_b.id)
    r = _create_comment(client, admin_a_token, auth, p_b.id)
    assert r.status_code == 404


def test_list_comments_for_entity(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    _create_comment(client, admin_a_token, auth, p.id)
    r = client.get(
        f"/api/comments?entity_type=project&entity_id={p.id}",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_update_own_comment(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    c = _create_comment(client, admin_a_token, auth, p.id).json()
    r = client.put(
        f"/api/comments/{c['id']}",
        json={"body": "更新"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["body"] == "更新"
    assert r.json()["is_edited"] is True


def test_delete_own_comment(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    c = _create_comment(client, admin_a_token, auth, p.id).json()
    r = client.delete(f"/api/comments/{c['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_comments_isolated_per_tenant(
    client, admin_a_token, admin_b_token, auth, project_factory, tenant_a
):
    p = project_factory(tenant_a.id)
    _create_comment(client, admin_a_token, auth, p.id)
    r = client.get(
        f"/api/comments?entity_type=project&entity_id={p.id}",
        headers=auth(admin_b_token),
    )
    assert r.status_code == 200
    assert r.json() == []


def test_cannot_update_other_user_comment(
    client, worker_a_token, admin_a_token, auth, project_factory, tenant_a
):
    p = project_factory(tenant_a.id)
    c = _create_comment(client, admin_a_token, auth, p.id).json()
    r = client.put(
        f"/api/comments/{c['id']}",
        json={"body": "侵入"},
        headers=auth(worker_a_token),
    )
    assert r.status_code == 403


def test_admin_can_delete_any_comment_in_tenant(
    client, worker_a_token, admin_a_token, auth, project_factory, tenant_a
):
    p = project_factory(tenant_a.id)
    c = _create_comment(client, worker_a_token, auth, p.id).json()
    r = client.delete(f"/api/comments/{c['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_comments_unauthenticated(client):
    r = client.get("/api/comments?entity_type=x&entity_id=y")
    assert r.status_code in (401, 403)


def test_unsupported_entity_type_rejected(client, admin_a_token, auth):
    r = client.post(
        "/api/comments",
        json={"entity_type": "nonexistent", "entity_id": "x", "body": "y"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 400
