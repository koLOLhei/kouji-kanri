"""自動バックアップサービス — DBダンプ + ローカルファイルのS3同期。

Renderの「再デプロイでファイルが消える」問題に対応。
定期実行はcronジョブ or API呼び出しで起動。
"""

import os
import subprocess
import logging
from datetime import datetime, timezone
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)


def backup_database_to_s3() -> dict:
    """PostgreSQL DBをpg_dumpしてS3にアップロード。"""
    db_url = settings.database_url
    if not db_url:
        return {"status": "skipped", "reason": "DATABASE_URL not set"}

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dump_file = f"/tmp/backup_{timestamp}.sql.gz"

    try:
        # pg_dumpはRenderのPostgreSQLに直接接続
        # DATABASE_URLからpg_dump形式に変換は不要（pg_dumpは--dbname=URLを受け付ける）
        result = subprocess.run(
            f'pg_dump --dbname="{db_url}" --no-owner --no-acl | gzip > {dump_file}',
            shell=True, capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            return {"status": "failed", "error": f"pg_dump failed: {result.stderr[:200]}"}

        file_size = os.path.getsize(dump_file)
        if file_size < 100:
            return {"status": "failed", "error": "Dump file too small, likely empty"}

        # S3にアップロード
        s3_key = f"backups/db/{timestamp}.sql.gz"
        from services.storage_service import upload_file
        with open(dump_file, "rb") as f:
            upload_file(f.read(), s3_key, content_type="application/gzip")

        # ローカルファイル削除
        os.unlink(dump_file)

        logger.info(f"[backup] DB backup uploaded: {s3_key} ({file_size} bytes)")
        return {
            "status": "completed",
            "s3_key": s3_key,
            "size_bytes": file_size,
            "timestamp": timestamp,
        }

    except subprocess.TimeoutExpired:
        return {"status": "failed", "error": "pg_dump timed out after 300s"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}
    finally:
        if os.path.exists(dump_file):
            os.unlink(dump_file)


def sync_local_files_to_s3() -> dict:
    """ローカルストレージの写真をS3にバックアップ。"""
    from services.storage_service import STORAGE_DIR, _use_s3, upload_file

    if _use_s3:
        return {"status": "skipped", "reason": "Already using S3 as primary storage"}

    if not STORAGE_DIR.exists():
        return {"status": "skipped", "reason": f"Storage directory not found: {STORAGE_DIR}"}

    uploaded = 0
    errors = 0
    total_size = 0

    for file_path in STORAGE_DIR.rglob("*"):
        if not file_path.is_file():
            continue
        relative_key = str(file_path.relative_to(STORAGE_DIR))
        try:
            file_data = file_path.read_bytes()
            # S3にバックアップ用プレフィックスを付けてアップロード
            backup_key = f"backups/files/{relative_key}"

            # S3クライアントを直接使う（_use_s3=Falseでもバックアップ先としてS3を使う）
            _upload_to_s3_direct(backup_key, file_data)
            uploaded += 1
            total_size += len(file_data)
        except Exception as e:
            errors += 1
            logger.warning(f"[backup] Failed to sync {relative_key}: {e}")

    return {
        "status": "completed",
        "files_uploaded": uploaded,
        "errors": errors,
        "total_size_bytes": total_size,
    }


def _upload_to_s3_direct(key: str, data: bytes):
    """S3に直接アップロード（_use_s3フラグに関係なく）。"""
    if not settings.s3_access_key or not settings.s3_secret_key:
        raise ValueError("S3 credentials not configured")

    import boto3
    from io import BytesIO
    from botocore.config import Config as BotoConfig
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=BotoConfig(signature_version="s3v4"),
    )
    client.upload_fileobj(BytesIO(data), settings.s3_bucket, key)


def run_full_backup() -> dict:
    """DB + ファイルの完全バックアップを実行。"""
    db_result = backup_database_to_s3()
    file_result = sync_local_files_to_s3()
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_result,
        "files": file_result,
    }
