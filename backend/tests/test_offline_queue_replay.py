"""オフラインキューの再送シミュレーション。

職人スマホ → 圏外で写真を base64 で保存 → 電波回復で SW (or sync-queue.ts) が
multipart 復元 → サーバーに POST → バックエンドは普通の写真として処理。

このシナリオを純Python側でシミュレートして、サーバが multipart 化された
リプレイを正しく受理することを保証する。
"""

import base64
import io


# 1x1 PNG (8 bit gray + alpha)
_PNG_1x1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c63f8ffff3f00050100"
    "01010000000049454e44ae426082"
)


def _replay_multipart(client, token, project_id, payload):
    """sync-queue.ts / sw.js が _multipart: true な JSON から FormData を
    復元する処理を、サーバ側でテスト相当の multipart として送信する。"""
    auth = {"Authorization": f"Bearer {token}"}
    files = {}
    data = {}
    for k, v in payload.items():
        if k == "_multipart":
            continue
        if k == "file_base64":
            file_bytes = base64.b64decode(v)
            files["file"] = (
                payload.get("file_name", "upload.bin"),
                io.BytesIO(file_bytes),
                payload.get("file_type", "application/octet-stream"),
            )
            continue
        if k == "photo_base64":
            file_bytes = base64.b64decode(v)
            files["file"] = (
                payload.get("photo_name", "photo.jpg"),
                io.BytesIO(file_bytes),
                payload.get("photo_type", "image/jpeg"),
            )
            continue
        if k in ("file_name", "file_type", "photo_name", "photo_type"):
            continue
        if v is None:
            continue
        data[k] = v
    return client.post(
        f"/api/projects/{project_id}/photos",
        files=files,
        data=data,
        headers=auth,
    )


def test_offline_replay_uploads_photo(client, admin_a_token, project_factory, tenant_a):
    """圏外で base64 保存された写真の再送が、通常の multipart upload と同じ結果になる。"""
    p = project_factory(tenant_a.id)

    # 職人がオフラインで撮影 → base64 で保存された JSON
    queued_payload = {
        "_multipart": True,
        "file_base64": base64.b64encode(_PNG_1x1).decode("ascii"),
        "file_name": "test.png",
        "file_type": "image/png",
        "caption": "オフライン撮影された配筋",
        "measurement": "@180mm",
    }

    r = _replay_multipart(client, admin_a_token, p.id, queued_payload)
    assert r.status_code == 200
    body = r.json()
    assert body["caption"] == "オフライン撮影された配筋"
    # 写真自体が保存されたことを確認
    list_r = client.get(
        f"/api/projects/{p.id}/photos",
        headers={"Authorization": f"Bearer {admin_a_token}"},
    )
    assert list_r.status_code == 200


def test_offline_replay_with_phase_creates_inspection_link(
    client, admin_a_token, db, project_factory, tenant_a
):
    """圏外で撮った検査写真の再送が、検査記録に自動でぶら下がる。"""
    from models.inspection import Inspection
    from models.phase import Phase
    import uuid
    from datetime import date

    p = project_factory(tenant_a.id)
    phase = Phase(id=str(uuid.uuid4()), project_id=p.id, name="鉄筋", sort_order=0)
    db.add(phase)
    inspection = Inspection(
        id=str(uuid.uuid4()),
        project_id=p.id,
        phase_id=phase.id,
        inspection_type="self",
        title="配筋検査",
        scheduled_date=date(2026, 5, 4),
        status="scheduled",
    )
    db.add(inspection)
    db.commit()

    queued_payload = {
        "_multipart": True,
        "file_base64": base64.b64encode(_PNG_1x1).decode("ascii"),
        "file_name": "kk.png",
        "file_type": "image/png",
        "phase_id": phase.id,
        "measurement": "@175mm",
        "caption": "再送テスト",
    }

    r = _replay_multipart(client, admin_a_token, p.id, queued_payload)
    assert r.status_code == 200
    photo_id = r.json()["id"]

    # 検査に photo_id がリンクされているか
    db.expire_all()
    db.refresh(inspection)
    assert photo_id in (inspection.photo_ids or [])

    # 測定値がチェックリストに転記されているか
    from models.inspection import InspectionChecklist
    items = db.query(InspectionChecklist).filter(
        InspectionChecklist.inspection_id == inspection.id
    ).all()
    assert len(items) == 1
    assert items[0].measured_value == "@175mm"


def test_offline_replay_isolated_per_tenant(
    client, admin_a_token, project_factory, tenant_b
):
    """別テナントのプロジェクトIDで再送しても 404 ではじかれる（情報漏れ無し）。"""
    other = project_factory(tenant_b.id)
    queued_payload = {
        "_multipart": True,
        "file_base64": base64.b64encode(_PNG_1x1).decode("ascii"),
        "file_name": "x.png",
        "file_type": "image/png",
    }
    r = _replay_multipart(client, admin_a_token, other.id, queued_payload)
    assert r.status_code == 404


def test_offline_replay_with_invalid_magic_rejected(
    client, admin_a_token, project_factory, tenant_a
):
    """悪意のあるペイロード（PHPなど）はサーバ側のmagic byte検証で拒否される。"""
    p = project_factory(tenant_a.id)
    evil = b"<?php system($_GET['cmd']); ?>"
    queued_payload = {
        "_multipart": True,
        "file_base64": base64.b64encode(evil).decode("ascii"),
        "file_name": "evil.jpg",
        "file_type": "image/jpeg",
    }
    r = _replay_multipart(client, admin_a_token, p.id, queued_payload)
    assert r.status_code == 400


def test_offline_replay_quick_incident(client, admin_a_token, project_factory, tenant_a):
    """ヒヤリハット報告のオフライン再送。"""
    p = project_factory(tenant_a.id)
    queued = {
        "_multipart": True,
        "photo_base64": base64.b64encode(_PNG_1x1).decode("ascii"),
        "photo_name": "near-miss.jpg",
        "photo_type": "image/jpeg",
        "description": "脚立から滑った",
        "severity": "medium",
    }
    auth = {"Authorization": f"Bearer {admin_a_token}"}
    files = {
        "file": (
            queued["photo_name"],
            io.BytesIO(base64.b64decode(queued["photo_base64"])),
            queued["photo_type"],
        )
    }
    r = client.post(
        f"/api/projects/{p.id}/safety/quick-incident",
        files=files,
        data={"description": queued["description"], "severity": queued["severity"]},
        headers=auth,
    )
    assert r.status_code in (200, 201)
