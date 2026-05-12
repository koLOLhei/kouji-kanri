"""ファイルアップロードのサイズ上限チェック共通ヘルパー。

DOS / ストレージ枯渇攻撃を防ぐため、全アップロードエンドポイントは
このヘルパーを通すこと。
"""

from __future__ import annotations

from services.errors import AppError

# 用途別の上限値 (bytes)
MAX_PHOTO_BYTES = 50 * 1024 * 1024       # 写真 50MB
MAX_REPORT_BYTES = 30 * 1024 * 1024      # PDF 報告書 30MB
MAX_FILE_ATTACHMENT_BYTES = 100 * 1024 * 1024  # 一般添付 100MB
MAX_CSV_IMPORT_BYTES = 20 * 1024 * 1024  # CSV インポート 20MB


def enforce_max_size(file_data: bytes, limit_bytes: int, label: str = "ファイル") -> None:
    """サイズ上限を超えていれば 413 を投げる。"""
    if len(file_data) > limit_bytes:
        mb = limit_bytes // (1024 * 1024)
        raise AppError(
            413,
            f"{label}サイズが上限 ({mb}MB) を超えています",
            "FILE_TOO_LARGE",
        )
