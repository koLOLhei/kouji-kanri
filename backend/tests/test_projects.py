"""Project CRUD + tenant isolation tests."""


def test_list_projects_empty_for_new_tenant(client, admin_a_token, auth):
    r = client.get("/api/projects", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_project(client, admin_a_token, auth):
    r = client.post(
        "/api/projects",
        json={"name": "新築マンション工事", "client_name": "発注者A"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "新築マンション工事"
    assert body["client_name"] == "発注者A"
    assert body["status"] == "planning"


def test_get_project(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id, name="既存案件")
    r = client.get(f"/api/projects/{p.id}", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["name"] == "既存案件"


def test_update_project(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.put(
        f"/api/projects/{p.id}",
        json={"name": "更新後", "status": "active"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["name"] == "更新後"
    assert r.json()["status"] == "active"


def test_delete_project_soft_delete(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.project import Project
    p = project_factory(tenant_a.id)
    r = client.delete(f"/api/projects/{p.id}", headers=auth(admin_a_token))
    assert r.status_code == 200
    db.refresh(p)
    assert p.status == "deleted"


def test_deleted_project_excluded_from_list(client, admin_a_token, auth, project_factory, tenant_a, db):
    p1 = project_factory(tenant_a.id, name="生きてる")
    p2 = project_factory(tenant_a.id, name="削除")
    p2.status = "deleted"
    db.commit()
    r = client.get("/api/projects", headers=auth(admin_a_token))
    names = [p["name"] for p in r.json()]
    assert "生きてる" in names
    assert "削除" not in names


def test_deleted_project_returns_404_on_get(client, admin_a_token, auth, project_factory, tenant_a, db):
    p = project_factory(tenant_a.id)
    p.status = "deleted"
    db.commit()
    r = client.get(f"/api/projects/{p.id}", headers=auth(admin_a_token))
    assert r.status_code == 404


# ── テナント分離 ─────────────────────────────────────────────────────────

def test_cannot_get_other_tenant_project(client, project_factory, tenant_b, admin_a_token, auth):
    """admin_a が tenant_b のプロジェクトを取得できないことを確認。"""
    p = project_factory(tenant_b.id, name="他テナント案件")
    r = client.get(f"/api/projects/{p.id}", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_update_other_tenant_project(client, project_factory, tenant_b, admin_a_token, auth):
    p = project_factory(tenant_b.id)
    r = client.put(
        f"/api/projects/{p.id}",
        json={"name": "改竄"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_cannot_delete_other_tenant_project(client, project_factory, tenant_b, admin_a_token, auth):
    p = project_factory(tenant_b.id)
    r = client.delete(f"/api/projects/{p.id}", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_list_excludes_other_tenant_projects(
    client, project_factory, tenant_a, tenant_b, admin_a_token, auth
):
    project_factory(tenant_a.id, name="自分の案件")
    project_factory(tenant_b.id, name="他人の案件")
    r = client.get("/api/projects", headers=auth(admin_a_token))
    names = [p["name"] for p in r.json()]
    assert names == ["自分の案件"]


def test_filter_by_status(client, admin_a_token, auth, project_factory, tenant_a, db):
    p1 = project_factory(tenant_a.id, name="active1")
    p2 = project_factory(tenant_a.id, name="completed1")
    p2.status = "completed"
    db.commit()

    r = client.get("/api/projects?status=completed", headers=auth(admin_a_token))
    names = [p["name"] for p in r.json()]
    assert "completed1" in names
    assert "active1" not in names


def test_phase_count_in_project_response(
    client, admin_a_token, auth, project_factory, tenant_a, db
):
    from models.phase import Phase
    import uuid

    p = project_factory(tenant_a.id)
    for i in range(3):
        ph = Phase(
            id=str(uuid.uuid4()),
            project_id=p.id,
            name=f"工程{i}",
            status="completed" if i < 2 else "in_progress",
            sort_order=i,
        )
        db.add(ph)
    db.commit()

    r = client.get(f"/api/projects/{p.id}", headers=auth(admin_a_token))
    body = r.json()
    assert body["phase_count"] == 3
    assert body["completed_phases"] == 2


def test_unauthenticated_cannot_list_projects(client):
    r = client.get("/api/projects")
    assert r.status_code in (401, 403)


def test_unauthenticated_cannot_create_project(client):
    r = client.post("/api/projects", json={"name": "x"})
    assert r.status_code in (401, 403)


def test_create_project_requires_name(client, admin_a_token, auth):
    r = client.post("/api/projects", json={}, headers=auth(admin_a_token))
    assert r.status_code == 422


def test_invalid_project_id_returns_404(client, admin_a_token, auth):
    r = client.get("/api/projects/00000000-0000-0000-0000-000000000000", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_update_invalid_project_id_returns_404(client, admin_a_token, auth):
    r = client.put(
        "/api/projects/00000000-0000-0000-0000-000000000000",
        json={"name": "x"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_worker_can_list_projects(client, worker_a_token, auth, project_factory, tenant_a):
    project_factory(tenant_a.id)
    r = client.get("/api/projects", headers=auth(worker_a_token))
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_case_study_generation(client, admin_a_token, auth, project_factory, tenant_a):
    """回帰: case_study が Phase.order_index を参照する古いバグ"""
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/case-study", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["title"] == p.name


def test_case_study_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/case-study", headers=auth(admin_a_token))
    assert r.status_code == 404
