"""Photo upload + EXIF + magic-byte validation tests."""

from io import BytesIO


# 1x1 PNG bytes
_PNG_1x1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c63f8ffff3f00050100"
    "01010000000049454e44ae426082"
)


def test_list_photos_empty(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/photos", headers=auth(admin_a_token))
    assert r.status_code == 200


def test_upload_photo_with_valid_png(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/photos",
        files={"file": ("test.png", BytesIO(_PNG_1x1), "image/png")},
        data={"caption": "テスト写真"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200
    assert r.json()["caption"] == "テスト写真"


def test_upload_rejects_invalid_magic(client, admin_a_token, auth, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.post(
        f"/api/projects/{p.id}/photos",
        files={"file": ("evil.jpg", BytesIO(b"<?php system($_GET['cmd']); ?>"), "image/jpeg")},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 400


def test_photos_isolated_between_tenants(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.get(f"/api/projects/{p.id}/photos", headers=auth(admin_a_token))
    assert r.status_code == 404


def test_cannot_upload_to_other_tenant_project(
    client, project_factory, tenant_b, admin_a_token, auth
):
    p = project_factory(tenant_b.id)
    r = client.post(
        f"/api/projects/{p.id}/photos",
        files={"file": ("test.png", BytesIO(_PNG_1x1), "image/png")},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 404


def test_photos_unauthenticated(client, project_factory, tenant_a):
    p = project_factory(tenant_a.id)
    r = client.get(f"/api/projects/{p.id}/photos")
    assert r.status_code in (401, 403)


def test_path_traversal_in_serve_file_blocked(client):
    """/api/files/{path:path} should reject ../ traversal."""
    r = client.get("/api/files/..%2F..%2Fetc%2Fpasswd")
    assert r.status_code == 400


def test_path_traversal_double_encoded_blocked(client):
    r = client.get("/api/files/%252e%252e%252fetc%252fpasswd")
    assert r.status_code == 400


def test_path_traversal_backslash_blocked(client):
    r = client.get("/api/files/..%5C..%5Cetc%5Cpasswd")
    assert r.status_code == 400


def test_path_traversal_null_byte_blocked(client):
    """null byte を含む path は Starlette のルーティング段階(404) もしくは serve_file の検証(400) で弾かれる。
    どちらにせよ、ファイル配信に到達しないことを保証する。"""
    r = client.get("/api/files/safe%00../../etc/passwd")
    assert r.status_code in (400, 404)


def test_path_traversal_absolute_path_blocked(client):
    # 先頭スラッシュは Starlette のルーター段階で消えるが、URLエンコード済みなら届く
    r = client.get("/api/files/%2Fetc%2Fpasswd")
    assert r.status_code == 400


def test_path_traversal_resolved_outside_storage_blocked(client):
    """STORAGE_DIR の外を指すキー (../foo) は _safe_local_path で None になる。"""
    # 上の `..` チェックで400なのでここでは別パターン: %2e%2e
    r = client.get("/api/files/%2e%2e/secret")
    assert r.status_code == 400
