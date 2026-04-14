"""Storage service with local filesystem fallback (S3/MinIO when available).

Storage backend selection:
  1. S3 / Cloudflare R2: when S3_ENDPOINT + S3_ACCESS_KEY + S3_SECRET_KEY are set.
  2. Render persistent disk:  /var/data/storage  (Render paid-plan disk mount).
  3. Local fallback: <backend>/storage/  — WARNING: files are lost on Render redeploy.

To configure Cloudflare R2 (free 10 GB):
  - Create a bucket in your R2 dashboard.
  - Generate API token with R2 object read/write.
  - Set env vars:  S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
                   S3_ACCESS_KEY=<token-access-key>
                   S3_SECRET_KEY=<token-secret-key>
                   S3_REGION=auto
                   S3_BUCKET=<bucket-name>
"""

import hashlib
import logging
import os
import uuid
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)

# Prefer Render persistent disk when it exists, otherwise use repo-relative storage/
_RENDER_PERSISTENT_PATH = Path("/var/data/storage")
if _RENDER_PERSISTENT_PATH.parent.exists():
    STORAGE_DIR = _RENDER_PERSISTENT_PATH
else:
    STORAGE_DIR = Path(__file__).parent.parent / "storage"

STORAGE_DIR.mkdir(parents=True, exist_ok=True)

_use_s3 = False


def _try_init_s3():
    global _use_s3
    # Require non-empty credentials — empty strings mean "not configured"
    if not (settings.s3_endpoint and settings.s3_access_key and settings.s3_secret_key):
        _use_s3 = False
        return None
    try:
        import boto3
        from botocore.config import Config as BotoConfig
        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
        client.list_buckets()
        _use_s3 = True
        return client
    except Exception as exc:
        logger.warning("[storage] S3 init failed (%s) — falling back to local storage", exc)
        _use_s3 = False
        return None


def ensure_bucket():
    """Create bucket if using S3, or ensure local storage dir."""
    client = _try_init_s3()
    if client:
        try:
            client.head_bucket(Bucket=settings.s3_bucket)
        except Exception:
            client.create_bucket(Bucket=settings.s3_bucket)
        logger.info("[storage] Using S3-compatible storage: %s / %s", settings.s3_endpoint, settings.s3_bucket)
    else:
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        is_render = os.environ.get("RENDER") == "true"
        using_persistent = str(STORAGE_DIR) == str(_RENDER_PERSISTENT_PATH)
        if is_render and not using_persistent:
            logger.warning(
                "[storage] WARNING: Running on Render WITHOUT a persistent disk and WITHOUT S3. "
                "Uploaded files will be LOST on every redeploy. "
                "Configure S3/R2 env vars or attach a Render persistent disk at /var/data."
            )
        else:
            logger.info("[storage] Using local filesystem storage: %s", STORAGE_DIR)


def _safe_local_path(key: str) -> Path | None:
    """Resolve a storage key to a local path, blocking path traversal attempts."""
    filepath = (STORAGE_DIR / key).resolve()
    if not str(filepath).startswith(str(STORAGE_DIR.resolve())):
        return None  # Path traversal attempt blocked
    return filepath


def upload_file(file_data: bytes, key: str, content_type: str = "application/octet-stream") -> str:
    """Upload file and return the key."""
    if _use_s3:
        from io import BytesIO
        import boto3
        from botocore.config import Config as BotoConfig
        client = boto3.client(
            "s3", endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
        client.upload_fileobj(BytesIO(file_data), settings.s3_bucket, key, ExtraArgs={"ContentType": content_type})
    else:
        filepath = _safe_local_path(key)
        if filepath is None:
            raise ValueError(f"Invalid storage key (path traversal blocked): {key}")
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_bytes(file_data)
    return key


def download_file(key: str) -> bytes | None:
    """Download file from storage. Returns bytes or None if not found."""
    if _use_s3:
        import boto3
        from botocore.config import Config as BotoConfig
        from botocore.exceptions import ClientError
        client = boto3.client(
            "s3", endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
        try:
            from io import BytesIO
            buf = BytesIO()
            client.download_fileobj(settings.s3_bucket, key, buf)
            buf.seek(0)
            return buf.read()
        except ClientError:
            return None
    else:
        filepath = _safe_local_path(key)
        if filepath and filepath.exists():
            return filepath.read_bytes()
        return None


def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Generate a URL for downloading."""
    if _use_s3:
        import boto3
        from botocore.config import Config as BotoConfig
        client = boto3.client(
            "s3", endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
        return client.generate_presigned_url(
            "get_object", Params={"Bucket": settings.s3_bucket, "Key": key}, ExpiresIn=expires_in,
        )
    else:
        return f"/api/files/{key}"


def get_local_file(key: str) -> Path | None:
    """Get local file path (for local storage mode)."""
    filepath = _safe_local_path(key)
    if filepath is None:
        return None  # Path traversal attempt blocked
    return filepath if filepath.exists() else None


def delete_file(key: str):
    """Delete a file."""
    if _use_s3:
        import boto3
        from botocore.config import Config as BotoConfig
        client = boto3.client(
            "s3", endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
        client.delete_object(Bucket=settings.s3_bucket, Key=key)
    else:
        filepath = _safe_local_path(key)
        if filepath is not None and filepath.exists():
            filepath.unlink()


def generate_upload_key(tenant_id: str, project_id: str, category: str, filename: str) -> str:
    """Generate a unique storage key."""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    unique = uuid.uuid4().hex[:8]
    return f"{tenant_id}/{project_id}/{category}/{unique}.{ext}"


def compute_checksum(file_data: bytes) -> str:
    """Compute SHA-256 hex digest of file data."""
    return hashlib.sha256(file_data).hexdigest()


def verify_file_checksum(key: str, expected_checksum: str) -> bool:
    """Verify that the stored file matches the expected SHA-256 checksum."""
    if _use_s3:
        import boto3
        from botocore.config import Config as BotoConfig
        from io import BytesIO
        client = boto3.client(
            "s3", endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
        buf = BytesIO()
        client.download_fileobj(settings.s3_bucket, key, buf)
        data = buf.getvalue()
    else:
        filepath = _safe_local_path(key)
        if filepath is None or not filepath.exists():
            return False
        data = filepath.read_bytes()
    actual = compute_checksum(data)
    return actual == expected_checksum


def read_file(key: str) -> bytes | None:
    """Read raw file bytes (local or S3)."""
    if _use_s3:
        import boto3
        from botocore.config import Config as BotoConfig
        from io import BytesIO
        client = boto3.client(
            "s3", endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
        buf = BytesIO()
        try:
            client.download_fileobj(settings.s3_bucket, key, buf)
            return buf.getvalue()
        except Exception:
            return None
    else:
        filepath = _safe_local_path(key)
        if filepath is None or not filepath.exists():
            return None
        return filepath.read_bytes()
