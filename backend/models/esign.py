"""電子署名モデル (Electronic Signature)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ElectronicSignature(Base):
    """電子署名レコード — 書類に対するタイムスタンプ付き電子署名。"""

    __tablename__ = "electronic_signatures"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    submission_id: Mapped[str] = mapped_column(String(36), nullable=False)
    document_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256 hex
    signer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    signer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    signer_role: Mapped[str | None] = mapped_column(String(100))  # "admin", "client", "inspector" etc.
    signed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    proof_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # 改ざん検知用プルーフ
    ip_address: Mapped[str | None] = mapped_column(String(50))  # 署名時のIPアドレス
    device_info: Mapped[str | None] = mapped_column(Text)  # User-Agentなど
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
