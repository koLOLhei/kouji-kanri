"""Storage service with local filesystem fallback (S3/MinIO when available)."""

import os
import uuid
from pathlib import Path

from config import settings

STORAGE_DIR = Path(__file__).parent.parent / "storage"
STORAGE_DIR.mkdir(exist_ok=True)

_use_s3 = False


def _try_init_s3():
    global _use_s3
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
    except Exception:
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
    else:
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)


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
        filepath = STORAGE_DIR / key
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_bytes(file_data)
    return key


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
    filepath = STORAGE_DIR / key
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
        filepath = STORAGE_DIR / key
        if filepath.exists():
            filepath.unlink()


def generate_upload_key(tenant_id: str, project_id: str, category: str, filename: str) -> str:
    """Generate a unique storage key."""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    unique = uuid.uuid4().hex[:8]
    return f"{tenant_id}/{project_id}/{category}/{unique}.{ext}"
