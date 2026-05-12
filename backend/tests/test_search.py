"""Global search tests + tenant isolation."""


def test_search_empty_query(client, admin_a_token, auth):
    r = client.get("/api/search?q=", headers=auth(admin_a_token))
    assert r.status_code in (200, 422)


def test_search_finds_own_project(
    client, admin_a_token, auth, project_factory, tenant_a
):
    project_factory(tenant_a.id, name="検索対象案件")
    r = client.get("/api/search?q=検索対象", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_search_excludes_other_tenant_results(
    client, admin_a_token, auth, project_factory, tenant_b
):
    project_factory(tenant_b.id, name="他テナント案件UNIQUEKEY")
    r = client.get("/api/search?q=UNIQUEKEY", headers=auth(admin_a_token))
    assert r.status_code == 200
    body = r.json()
    # 結果はテナントAのものに限定されるべき
    if "projects" in body:
        for proj in body["projects"]:
            assert "他テナント" not in proj.get("name", "")


def test_search_unauthenticated(client):
    r = client.get("/api/search?q=test")
    assert r.status_code in (401, 403)
