"""Document versioning model – tracks revisions of generated submissions."""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class DocumentVersion(Base):
    """提出書類のバージョン管理"""
    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    file_key: Mapped[str] = mapped_column(String(500), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), nullable=False)
    created_by_name: Mapped[str | None] = mapped_column(String(255))
    change_description: Mapped[str | None] = mapped_column(Text)
    checksum: Mapped[str | None] = mapped_column(String(64))  # SHA-256 hex digest
    file_size: Mapped[int | None] = mapped_column(Integer)
    is_current: Mapped[bool] = mapped_column(
        # Not using Boolean here to avoid import cycle; use Integer 0/1
        Integer, default=1
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
