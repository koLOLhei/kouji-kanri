"""Daily report CRUD + tenant isolation tests."""

from datetime import date, timedelta


def test_list_daily_reports_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/daily-reports", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_daily_report(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/daily-reports",
        json={
            "report_date": "2026-05-04",
            "weather_morning": "晴れ",
            "weather_afternoon": "晴れ",
            "temperature_max": 22.5,
            "temperature_min": 12.0,
            "work_description": "鉄筋組立",
            "worker_count": 8,
        },
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["worker_count"] == 8
    assert body["weather_morning"] == "晴れ"


def test_get_daily_report(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.daily_report import DailyReport
    import uuid
    p = project_factory(tenant_a.id)
    rep = DailyReport(
        id=str(uuid.uuid4()),
        project_id=p.id,
        report_date=date(2026, 1, 1),
        work_description="基礎打設",
    )
    db.add(rep); db.commit()
    r = client.get(f"/api/projects/{p.id}/daily-reports/{rep.id}", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["work_description"] == "基礎打設"


def test_update_daily_report(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.daily_report import DailyReport
    import uuid
    p = project_factory(tenant_a.id)
    rep = DailyReport(id=str(uuid.uuid4()), project_id=p.id, report_date=date(2026,1,1))
    db.add(rep); db.commit()
    r = client.put(
        f"/api/projects/{p.id}/daily-reports/{rep.id}",
        json={"work_description": "改訂後", "worker_count": 12},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["work_description"] == "改訂後"
    assert r.json()["worker_count"] == 12


def test_filter_by_date_range(client, admin_a_token, auth, project_factory, tenant_a, db):
    from models.daily_report import DailyReport
    import uuid
    p = project_factory(tenant_a.id)
    for d in [date(2026,1,1), date(2026,2,1), date(2026,3,1)]:
        rep = DailyReport(id=str(uuid.uuid4()), project_id=p.id, report_date=d)
        db.add(rep)
    db.commit()
    r = client.get(
        f"/api/projects/{p.id}/daily-reports?date_from=2026-02-01&date_to=2026-02-28",
        headers=auth(admin_a_token),
    )
    assert len(r.json()) == 1


def test_negative_worker_count_rejected(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/daily-reports",
        json={"report_date": "2026-05-04", "worker_count": -1},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 422


def test_cannot_access_daily_reports_of_other_tenant(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/daily-reports", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_create_daily_report_in_other_tenant(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.post(
        f"/api/projects/{p.id}/daily-reports",
        json={"report_date": "2026-05-04"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_get_nonexistent_daily_report_returns_404(
    client, admin_a_token, auth, project_factory, tenant_a
):
    p = project_factory(tenant_a.id)
    r = client.get(
        f"/api/projects/{p.id}/daily-reports/00000000-0000-0000-0000-000000000000",
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_daily_report_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/daily-reports")
    assert r.status_code in (401, 403)


def test_daily_report_negative_temperature_allowed(client, admin_a_token, auth, project_factory, tenant_a):
    """冬季は氷点下も記録可能であるべき。"""
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/daily-reports",
        json={"report_date": "2026-01-15", "temperature_min": -5.5},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["temperature_min"] == -5.5
