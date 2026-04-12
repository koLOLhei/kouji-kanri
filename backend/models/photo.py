"""Photo (工事写真) model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    requirement_id: Mapped[str | None] = mapped_column(String(36))
    file_key: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_key: Mapped[str | None] = mapped_column(String(500))
    original_filename: Mapped[str | None] = mapped_column(String(500))
    file_size: Mapped[int | None] = mapped_column(Integer)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime)
    gps_lat: Mapped[float | None] = mapped_column(Float)
    gps_lng: Mapped[float | None] = mapped_column(Float)
    caption: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(JSON, nullable=True, default=list)  # Always a list of strings
    uploaded_by: Mapped[str | None] = mapped_column(String(36))
    checksum: Mapped[str | None] = mapped_column(String(64))  # SHA-256 hex digest
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # 電子納品 / 写真分類フィールド
    work_type: Mapped[str | None] = mapped_column(String(100))        # 工種
    work_subtype: Mapped[str | None] = mapped_column(String(100))     # 種別
    work_detail: Mapped[str | None] = mapped_column(String(100))      # 細別
    photo_category: Mapped[str | None] = mapped_column(String(50))   # 写真区分（着手前/施工状況/完成/…）
    photo_number: Mapped[int | None] = mapped_column(Integer)         # 写真番号（区分内連番）
