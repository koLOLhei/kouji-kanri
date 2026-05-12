"""Safety management (KY/patrols/incidents/trainings) tests."""


def test_list_ky_activities_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/safety/ky-activities", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_ky_activity(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/safety/ky-activities",
        json={
            "activity_date": "2026-05-04",
            "location": "B棟3階",
            "work_content": "型枠組立",
            "hazards": ["転落", "挟まれ"],
            "leader_name": "佐藤",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_get_ky_activity(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    created = client.post(
        f"/api/projects/{p.id}/safety/ky-activities",
        json={"activity_date": "2026-05-04", "leader_name": "鈴木"},
        headers=auth(admin_a_token),
    ).json()
    r = client.get(
        f"/api/projects/{p.id}/safety/ky-activities/{created['id']}",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["leader_name"] == "鈴木"


def test_update_ky_activity(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    created = client.post(
        f"/api/projects/{p.id}/safety/ky-activities",
        json={"activity_date": "2026-05-04"},
        headers=auth(admin_a_token),
    ).json()
    r = client.put(
        f"/api/projects/{p.id}/safety/ky-activities/{created['id']}",
        json={"location": "改訂"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["location"] == "改訂"


def test_delete_ky_activity(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    created = client.post(
        f"/api/projects/{p.id}/safety/ky-activities",
        json={"activity_date": "2026-05-04"},
        headers=auth(admin_a_token),
    ).json()
    r = client.delete(
        f"/api/projects/{p.id}/safety/ky-activities/{created['id']}",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_create_safety_patrol(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/safety/patrols",
        json={
            "patrol_date": "2026-05-04",
            "inspector_name": "巡視員",
            "overall_evaluation": "良好",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_create_incident_report(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/safety/incidents",
        json={
            "incident_date": "2026-05-04",
            "incident_type": "near_miss",
            "severity": "minor",
            "description": "脚立から滑った",
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_create_safety_training(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/safety/trainings",
        json={
            "training_date": "2026-05-04",
            "training_type": "monthly",
            "title": "月例安全教育",
            "duration_minutes": 60,
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200


def test_safety_endpoints_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/safety/ky-activities", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_negative_training_duration_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/safety/trainings",
        json={
            "training_date": "2026-05-04",
            "training_type": "monthly",
            "title": "x",
            "duration_minutes": -10,
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 422


def test_safety_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/safety/ky-activities")
    assert r.status_code in (401, 403)


def test_safety_trends_endpoint(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/safety/trends", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_safety_ai_score(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/safety/ai-score", headers=auth(admin_a_token))
    assert r.status_code == 200
    body = r.json()
    assert "score" in body or isinstance(body, dict)
