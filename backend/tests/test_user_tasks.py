"""User task (個人タスク) tests."""


def _create_task(client, token, auth, **kw):
    body = {"title": kw.get("title", "タスク"), "priority": kw.get("priority", "medium")}
    body.update(kw)
    return client.post("/api/tasks", json=body, headers=auth(token))


def test_list_tasks_empty(client, admin_a_token, auth):
    r = client.get("/api/tasks", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_task(client, admin_a_token, auth):
    r = _create_task(client, admin_a_token, auth, title="買い物", priority="high")
    assert r.status_code == 201
    assert r.json()["title"] == "買い物"


def test_today_tasks(client, admin_a_token, auth):
    # endpoint は today_jst() を使うので、UTC環境でも JST 日付で作成する
    from services.timezone_utils import today_jst
    today = today_jst().isoformat()
    _create_task(client, admin_a_token, auth, title="今日のタスク", due_date=today)
    r = client.get("/api/tasks/today", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert any(t["title"] == "今日のタスク" for t in r.json())


def test_overdue_tasks(client, admin_a_token, auth):
    from datetime import timedelta
    from services.timezone_utils import today_jst
    yesterday = (today_jst() - timedelta(days=1)).isoformat()
    _create_task(client, admin_a_token, auth, title="期限切れ", due_date=yesterday)
    r = client.get("/api/tasks/overdue", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert any(t["title"] == "期限切れ" for t in r.json())


def test_update_task(client, admin_a_token, auth):
    t = _create_task(client, admin_a_token, auth).json()
    r = client.put(
        f"/api/tasks/{t['id']}",
        json={"title": "更新"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["title"] == "更新"


def test_complete_task(client, admin_a_token, auth):
    t = _create_task(client, admin_a_token, auth).json()
    r = client.put(f"/api/tasks/{t['id']}/complete", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json()["completed"] is True


def test_delete_task(client, admin_a_token, auth):
    t = _create_task(client, admin_a_token, auth).json()
    r = client.delete(f"/api/tasks/{t['id']}", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_tasks_isolated_per_user_and_tenant(
    client, admin_a_token, admin_b_token, auth
):
    _create_task(client, admin_a_token, auth, title="自分の")
    _create_task(client, admin_b_token, auth, title="他人の")
    r = client.get("/api/tasks", headers=auth(admin_a_token))
    titles = [t["title"] for t in r.json()]
    assert titles == ["自分の"]


def test_cannot_update_other_users_task(client, admin_a_token, admin_b_token, auth):
    t_b = _create_task(client, admin_b_token, auth).json()
    r = client.put(
        f"/api/tasks/{t_b['id']}",
        json={"title": "侵入"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_filter_tasks_by_completed(client, admin_a_token, auth):
    t1 = _create_task(client, admin_a_token, auth, title="open").json()
    t2 = _create_task(client, admin_a_token, auth, title="done").json()
    client.put(f"/api/tasks/{t2['id']}/complete", headers=auth(admin_a_token))
    r = client.get("/api/tasks?completed=false", headers=auth(admin_a_token))
    titles = [t["title"] for t in r.json()]
    assert "open" in titles
    assert "done" not in titles


def test_tasks_unauthenticated(client):
    r = client.get("/api/tasks")
    assert r.status_code in (401, 403)


def test_filter_by_priority(client, admin_a_token, auth):
    _create_task(client, admin_a_token, auth, title="A", priority="high")
    _create_task(client, admin_a_token, auth, title="B", priority="low")
    r = client.get("/api/tasks?priority=high", headers=auth(admin_a_token))
    titles = [t["title"] for t in r.json()]
    assert titles == ["A"]
