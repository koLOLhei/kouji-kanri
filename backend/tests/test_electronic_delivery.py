"""Electronic delivery (電子納品) tests."""


def test_list_photo_categories_public(client):
    r = client.get("/api/electronic-delivery/photo-categories")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_work_types_public(client):
    r = client.get("/api/electronic-delivery/work-types")
    assert r.status_code == 200


def test_preview_endpoint(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(
        f"/api/projects/{p.id}/electronic-delivery/preview",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_validate_endpoint(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(
        f"/api/projects/{p.id}/electronic-delivery/validate",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_preview_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(
        f"/api/projects/{p.id}/electronic-delivery/preview",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_preview_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/electronic-delivery/preview")
    assert r.status_code in (401, 403)


def test_subtypes_for_unknown_work_type(client):
    """Unknown 工種 should return empty list."""
    r = client.get("/api/electronic-delivery/work-types/UnknownType/subtypes")
    assert r.status_code == 200
