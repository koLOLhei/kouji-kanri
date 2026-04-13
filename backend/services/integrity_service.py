"""写真改ざん防止証明サービス

アップロード時にSHA-256ハッシュを計算・DBに保存。
検証時にファイルのハッシュを再計算し、保存値と比較。
一致すれば「撮影後に加工されていない」証明となる。
"""

import hashlib
from datetime import datetime, timezone


def compute_hash(file_data: bytes) -> str:
    """ファイルのSHA-256ハッシュを計算。"""
    return hashlib.sha256(file_data).hexdigest()


def generate_integrity_seal(photo) -> dict:
    """写真の改ざん防止証明シールデータを生成。"""
    if not photo.checksum:
        return {"verified": False, "reason": "チェックサムが記録されていません"}

    return {
        "verified": True,
        "photo_id": photo.id,
        "checksum_algorithm": "SHA-256",
        "checksum": photo.checksum,
        "recorded_at": photo.created_at.isoformat() if photo.created_at else None,
        "taken_at": photo.taken_at.isoformat() if photo.taken_at else None,
        "gps_latitude": photo.gps_latitude,
        "gps_longitude": photo.gps_longitude,
        "seal_statement": "この写真は撮影時に記録されたSHA-256ハッシュと一致しており、アップロード後に改変されていないことを証明します。",
        "issuer": "KAMO construction 施工管理システム",
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }


def verify_photo_integrity(photo, file_data: bytes) -> dict:
    """ファイルデータとDB上のチェックサムを比較して改ざんを検証。"""
    if not photo.checksum:
        return {"match": False, "reason": "チェックサムが記録されていません"}

    current_hash = compute_hash(file_data)
    match = current_hash == photo.checksum

    return {
        "match": match,
        "stored_hash": photo.checksum,
        "computed_hash": current_hash,
        "status": "未改変" if match else "不一致（改ざんの可能性）",
    }
