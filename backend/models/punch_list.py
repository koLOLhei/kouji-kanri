"""Punch List / Defect Management model (指摘事項・是正管理)."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class PunchListItem(Base):
    """工事パンチリスト・指摘事項 (Punch List / Defect Tracking)."""

    __tablename__ = "punch_list_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)  # 場所
    title: Mapped[str] = mapped_column(String(200), nullable=False)  # 指摘事項タイトル
    description: Mapped[str | None] = mapped_column(Text)  # 詳細説明
    severity: Mapped[str] = mapped_column(String(30), default="minor")
    # "minor" | "major" | "critical"
    status: Mapped[str] = mapped_column(String(30), default="open")
    # "open" | "in_progress" | "resolved" | "verified"
    reported_by: Mapped[str] = mapped_column(String(100), nullable=False)  # 報告者氏名
    reported_by_role: Mapped[str] = mapped_column(String(50), default="inspector")
    # "client" | "inspector" | "manager"
    assigned_to: Mapped[str | None] = mapped_column(String(100))  # 対応担当者
    photo_ids: Mapped[list | None] = mapped_column(JSON)  # 指摘時写真 (before)
    resolution_photo_ids: Mapped[list | None] = mapped_column(JSON)  # 是正後写真 (after)
    resolution_notes: Mapped[str | None] = mapped_column(Text)  # 是正内容メモ
    due_date: Mapped[date | None] = mapped_column(Date)  # 対応期限
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)  # 是正完了日時
    verified_at: Mapped[datetime | None] = mapped_column(DateTime)  # 検証完了日時
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
