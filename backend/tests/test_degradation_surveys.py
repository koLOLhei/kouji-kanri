"""劣化診断（現地調査）API tests — kamo-hp 社内ツール連携。"""


def _sample():
    return {
        "property_name": "グランドメゾン高津",
        "address": "川崎市高津区末長1-2-3",
        "overall_grade": "d",
        "inspector_name": "小川公平",
        "survey_date": "2026-06-26",
        "status": "draft",
        "data": {
            "building": {"propertyName": "グランドメゾン高津", "wallArea": 2400},
            "wall": {"crackWidth": 1.2, "grade": "d"},
            "tile": {"pullStrength": 0.32, "grade": "c"},
        },
        "photos": [
            {"id": "p1", "sectionKey": "wall", "caption": "構造クラック", "dataUrl": "data:image/jpeg;base64,AAAA"},
        ],
    }


def test_list_empty(client, admin_a_token, auth):
    r = client.get("/api/degradation-surveys", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert r.json() == []


def test_create_and_get(client, admin_a_token, auth):
    r = client.post("/api/degradation-surveys", json=_sample(), headers=auth(admin_a_token))
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["property_name"] == "グランドメゾン高津"
    assert created["overall_grade"] == "d"
    sid = created["id"]

    g = client.get(f"/api/degradation-surveys/{sid}", headers=auth(admin_a_token))
    assert g.status_code == 200
    body = g.json()
    assert body["data"]["wall"]["crackWidth"] == 1.2
    assert body["data"]["tile"]["pullStrength"] == 0.32
    assert len(body["photos"]) == 1


def test_list_is_lightweight(client, admin_a_token, auth):
    client.post("/api/degradation-surveys", json=_sample(), headers=auth(admin_a_token))
    r = client.get("/api/degradation-surveys", headers=auth(admin_a_token))
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    # 一覧は重いdata/photosを含まず、photo_countのみ返す
    assert "data" not in items[0]
    assert "photos" not in items[0]
    assert items[0]["photo_count"] == 1


def test_update_partial_keeps_data(client, admin_a_token, auth):
    sid = client.post("/api/degradation-surveys", json=_sample(), headers=auth(admin_a_token)).json()["id"]
    r = client.put(
        f"/api/degradation-surveys/{sid}",
        json={"status": "completed", "overall_grade": "c"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    assert r.json()["overall_grade"] == "c"
    # data は更新対象外なので保持される
    assert r.json()["data"]["wall"]["crackWidth"] == 1.2


def test_update_data_null_does_not_wipe(client, admin_a_token, auth):
    """data:null / photos:null は無視され、既存の値が保持される（全消去バグ防止）。"""
    sid = client.post("/api/degradation-surveys", json=_sample(), headers=auth(admin_a_token)).json()["id"]
    r = client.put(
        f"/api/degradation-surveys/{sid}",
        json={"status": "completed", "data": None, "photos": None},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    assert r.json()["data"]["wall"]["crackWidth"] == 1.2  # 保持される
    assert len(r.json()["photos"]) == 1  # 保持される


def test_delete(client, admin_a_token, auth):
    sid = client.post("/api/degradation-surveys", json=_sample(), headers=auth(admin_a_token)).json()["id"]
    d = client.delete(f"/api/degradation-surveys/{sid}", headers=auth(admin_a_token))
    assert d.status_code == 200
    g = client.get(f"/api/degradation-surveys/{sid}", headers=auth(admin_a_token))
    assert g.status_code == 404


def test_requires_auth(client):
    r = client.get("/api/degradation-surveys")
    assert r.status_code in (401, 403)


def test_shared_within_tenant(client, admin_a_token, worker_a_token, auth):
    """同一テナントの別ユーザーから閲覧できる（共有）。"""
    sid = client.post("/api/degradation-surveys", json=_sample(), headers=auth(admin_a_token)).json()["id"]
    g = client.get(f"/api/degradation-surveys/{sid}", headers=auth(worker_a_token))
    assert g.status_code == 200
    assert g.json()["property_name"] == "グランドメゾン高津"


def test_tenant_isolation(client, admin_a_token, admin_b_token, auth):
    """別テナントからは閲覧・更新・削除できない。"""
    sid = client.post("/api/degradation-surveys", json=_sample(), headers=auth(admin_a_token)).json()["id"]
    assert client.get(f"/api/degradation-surveys/{sid}", headers=auth(admin_b_token)).status_code == 404
    assert client.get("/api/degradation-surveys", headers=auth(admin_b_token)).json() == []
    assert client.put(f"/api/degradation-surveys/{sid}", json={"status": "x"}, headers=auth(admin_b_token)).status_code == 404
    assert client.delete(f"/api/degradation-surveys/{sid}", headers=auth(admin_b_token)).status_code == 404
