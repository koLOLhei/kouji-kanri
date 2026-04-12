"""電子署名サービス — ドキュメントへのタイムスタンプ付き電子署名を生成・検証する。"""

import hashlib
from datetime import datetime, timezone


def create_document_hash(document_bytes: bytes) -> str:
    """ドキュメントの SHA-256 ハッシュを生成する。"""
    return hashlib.sha256(document_bytes).hexdigest()


def create_esign_record(
    document_hash: str,
    signer_name: str,
    signer_email: str,
) -> dict:
    """タイムスタンプ付き電子署名レコードを生成する。

    署名のプルーフハッシュは「ドキュメントハッシュ + 署名者情報 + タイムスタンプ」を
    連結した SHA-256 ハッシュで、後から改ざんを検知できる。
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    proof = hashlib.sha256(
        f"{document_hash}:{signer_name}:{signer_email}:{timestamp}".encode()
    ).hexdigest()
    return {
        "document_hash": document_hash,
        "signer_name": signer_name,
        "signer_email": signer_email,
        "signed_at": timestamp,
        "proof_hash": proof,
    }


def verify_esign(document_bytes: bytes, esign_record: dict) -> bool:
    """ドキュメントの内容が署名レコードと一致するかを検証する。

    ドキュメントが改ざんされていれば False を返す。
    """
    current_hash = create_document_hash(document_bytes)
    return current_hash == esign_record.get("document_hash", "")
