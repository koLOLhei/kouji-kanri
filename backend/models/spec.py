"""Specification chapter and regional override models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class SpecChapter(Base):
    """仕様書の章構成 (公共建築工事標準仕様書ベース)"""
    __tablename__ = "spec_chapters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    spec_code: Mapped[str] = mapped_column(String(100), nullable=False)  # 'kokyo_r7'
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)
    section_number: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    required_documents: Mapped[dict] = mapped_column(JSON, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class RegionalOverride(Base):
    """地域仕様の差分"""
    __tablename__ = "regional_overrides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    region: Mapped[str] = mapped_column(String(100), nullable=False)
    spec_chapter_id: Mapped[str | None] = mapped_column(String(36))
    override_type: Mapped[str] = mapped_column(String(50), nullable=False)  # add_requirement, modify, remove
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SpecContent(Base):
    """仕様書 PDFの全文 (ページ単位)

    spec_code: 仕様書識別子。例:
      - 'kokyo_r4' = 公共建築工事標準仕様書（建築工事編）R4
      - 'kaisyu_r2' = 建築改修工事特記仕様書 令和2年4月版
      - 'yokohama_estimate' = 建築工事積算マニュアル（横浜市）
    """
    __tablename__ = "spec_contents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    spec_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    chapter: Mapped[str | None] = mapped_column(String(500))
    section: Mapped[str | None] = mapped_column(String(500))
    title: Mapped[str | None] = mapped_column(String(500))
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
