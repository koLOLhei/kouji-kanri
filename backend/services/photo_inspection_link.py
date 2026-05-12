"""写真→検査記録/是正措置の自動リンクサービス。

職人がスマホで写真を撮って `requirement_id` または `phase_id` を指定してアップした時、
該当する未完了の `Inspection` レコードがあれば `photo_ids` に自動追加する。

加えて、未クローズの `CorrectiveAction` (NCR) があれば、是正措置の
「是正完了写真」として `photo_ids` に追加する（再施工写真の証跡として機能）。

電子黒板情報（測定値）が含まれていれば、`Inspection` の checklist に
"自動転記された測定" として行を追加する仕組み。
"""

from __future__ import annotations

import json
import logging

from sqlalchemy.orm import Session

from models.corrective_action import CorrectiveAction
from models.inspection import Inspection, InspectionChecklist
from models.photo import Photo

logger = logging.getLogger(__name__)


def _photo_ids_list(raw) -> list[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else []
        except (ValueError, TypeError):
            return []
    return []


def link_photo_to_inspection(
    db: Session,
    photo: Photo,
    measurement: str | None = None,
) -> Inspection | None:
    """写真 → 検査の自動リンク。

    Args:
        db: SQLAlchemy セッション。
        photo: アップロード済みの Photo レコード（既に commit 済み）。
        measurement: 電子黒板の測定値（"配筋ピッチ@200" 等）。

    Returns:
        リンク先の Inspection（無ければ None）。
    """
    if not photo.requirement_id and not photo.phase_id:
        return None

    # 検査の検索: 同 phase かつステータス未完了の検査を最優先
    query = db.query(Inspection).filter(
        Inspection.project_id == photo.project_id,
        Inspection.status.in_(("scheduled", "in_progress")),
    )
    if photo.phase_id:
        query = query.filter(Inspection.phase_id == photo.phase_id)
    inspection = query.order_by(Inspection.scheduled_date.asc().nullslast()).first()

    if not inspection:
        return None

    # photo_ids JSON 配列に追加（既にあればスキップ）
    existing = _photo_ids_list(inspection.photo_ids)
    if photo.id not in existing:
        existing.append(photo.id)
        inspection.photo_ids = existing

    # 測定値があれば checklist に自動転記
    if measurement and measurement.strip():
        checklist_item = InspectionChecklist(
            inspection_id=inspection.id,
            category="auto_imported",
            item_name=f"写真自動転記: {photo.caption or photo.original_filename or 'photo'}",
            measured_value=measurement.strip(),
            comment=(
                f"撮影日時: {photo.taken_at.isoformat() if photo.taken_at else '-'}, "
                f"GPS: {photo.gps_lat or '-'}, {photo.gps_lng or '-'}"
            ),
        )
        db.add(checklist_item)

    db.commit()
    logger.info(
        "[photo-inspection] photo %s linked to inspection %s (measurement: %s)",
        photo.id,
        inspection.id,
        measurement or "—",
    )
    return inspection


def link_photo_to_corrective_action(
    db: Session,
    photo: Photo,
) -> CorrectiveAction | None:
    """写真 → 是正措置 (NCR) の自動リンク。

    再施工写真をアップロードした時、該当の未クローズ NCR があれば
    `photo_ids` に自動追加する。これで監査時の「再施工証跡」が
    レコードに紐付き、紙ファイルから写真を引っ張り出す世界が消える。
    """
    if not photo.phase_id:
        # 工程指定がないと NCR との対応が取れないので何もしない
        return None

    # 同 project かつ未クローズ (open / in_progress / verified) の NCR を「最新作成」順
    # 業務想定: 職人がスマホで撮った再施工写真は「直近に建築士が指示した是正」に紐付ける。
    # 最古順だと過去の別件NCRに付いてしまう。
    query = db.query(CorrectiveAction).filter(
        CorrectiveAction.project_id == photo.project_id,
        CorrectiveAction.status.in_(("open", "in_progress", "verified")),
    )
    ncr = query.order_by(CorrectiveAction.created_at.desc()).first()
    if not ncr:
        return None

    existing = _photo_ids_list(ncr.photo_ids)
    if photo.id in existing:
        return ncr  # 既にリンク済み

    existing.append(photo.id)
    ncr.photo_ids = existing
    db.commit()
    logger.info(
        "[photo-ncr] photo %s linked to corrective_action %s (status=%s)",
        photo.id,
        ncr.id,
        ncr.status,
    )
    return ncr
