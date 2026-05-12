"""Phase CRUD + tenant isolation tests."""


def test_list_phases_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/phases", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_phase(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/phases",
        json={"name": "基礎工事", "sort_order": 0},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["name"] == "基礎工事"


def test_get_phase(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.phase import Phase
    import uuid
    p = project_factory(tenant_a.id)
    ph = Phase(id=str(uuid.uuid4()), project_id=p.id, name="鉄筋工事", sort_order=1)
    db.add(ph); db.commit()
    r = client.get(f"/api/projects/{p.id}/phases/{ph.id}", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["name"] == "鉄筋工事"


def test_update_phase(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.phase import Phase
    import uuid
    p = project_factory(tenant_a.id)
    ph = Phase(id=str(uuid.uuid4()), project_id=p.id, name="orig", sort_order=0)
    db.add(ph); db.commit()
    r = client.put(
        f"/api/projects/{p.id}/phases/{ph.id}",
        json={"name": "renamed", "status": "in_progress", "progress_percent": 50},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "renamed"
    assert body["status"] == "in_progress"
    assert body["progress_percent"] == 50


def test_cannot_list_phases_in_other_tenant_project(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p_b = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p_b.id}/phases", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_create_phase_in_other_tenant(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p_b = project_factory(tenant_b.id)
    r = client.post(
        f"/api/projects/{p_b.id}/phases",
        json={"name": "侵入"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_init_from_spec_creates_chapters(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.spec import SpecChapter
    import uuid
    p = project_factory(tenant_a.id)
    # 仕様書チャプターを最低1件投入
    ch = SpecChapter(
        id=str(uuid.uuid4()),
        spec_code="kokyo_r7",
        chapter_number=1,
        title="1章 共通事項",
        sort_order=0,
    )
    db.add(ch); db.commit()
    r = client.post(
        f"/api/projects/{p.id}/phases/init-from-spec",
        headers=auth(admin_a_token),
    )
    assert r.status_code in (200, 201)


def test_phase_unauthenticated_rejected(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/phases")
    assert r.status_code in (401, 403)


def test_phase_create_requires_name(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(f"/api/projects/{p.id}/phases", json={}, headers=auth(admin_a_token))
    assert r.status_code == 422


def test_get_nonexistent_phase_returns_404(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(
        f"/api/projects/{p.id}/phases/00000000-0000-0000-0000-000000000000",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_phases_sorted_by_sort_order(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.phase import Phase
    import uuid
    p = project_factory(tenant_a.id)
    for i, name in enumerate(["3rd", "1st", "2nd"]):
        ph = Phase(id=str(uuid.uuid4()), project_id=p.id, name=name, sort_order=[2,0,1][i])
        db.add(ph)
    db.commit()
    r = client.get(f"/api/projects/{p.id}/phases", headers=auth(admin_a_token))
    names = [x["name"] for x in r.json()]
    assert names == ["1st", "2nd", "3rd"]


def test_phase_checklist_endpoint(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.phase import Phase, PhaseRequirement
    import uuid
    p = project_factory(tenant_a.id)
    ph = Phase(id=str(uuid.uuid4()), project_id=p.id, name="testphase", sort_order=0)
    db.add(ph)
    db.add(PhaseRequirement(
        id=str(uuid.uuid4()),
        phase_id=ph.id,
        requirement_type="photo",
        name="施工前写真",
        min_count=1,
    ))
    db.commit()
    r = client.get(f"/api/projects/{p.id}/phases/{ph.id}/checklist", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "施工前写真"
