"""G9 工事概要書モデル

Project と 1:1 で対応する工事概要情報。
工事名称・場所・範囲、構造、床面積内訳、別途工事、特記事項等を保持。
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Text, Numeric, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ProjectOverview(Base):
    """工事概要書 (Project 1:1)"""
    __tablename__ = "project_overviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, unique=True, index=True)
    work_name: Mapped[str | None] = mapped_column(String(500))  # 工事名称 (Project からデフォルト)
    work_location: Mapped[str | None] = mapped_column(String(500))  # 工事場所
    work_scope: Mapped[str | None] = mapped_column(String(1000))  # 工事範囲
    total_floor_area: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))  # 建築床面積 (m2)
    structure: Mapped[str | None] = mapped_column(String(255))  # 構造
    floors_breakdown: Mapped[list | None] = mapped_column(JSON)  # [{floor:'1F', area:120}, ...]
    separate_works: Mapped[list | None] = mapped_column(JSON)  # 別途工事一覧
    special_notes: Mapped[str | None] = mapped_column(Text)  # 特記事項
    remarks: Mapped[str | None] = mapped_column(Text)  # 備考
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
