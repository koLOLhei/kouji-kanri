"""廃棄物管理 (Waste Manifest Management) model."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Float, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class WasteManifest(Base):
    """産業廃棄物管理票 (マニフェスト)"""
    __tablename__ = "waste_manifests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    manifest_number: Mapped[str] = mapped_column(String(100), nullable=False)  # マニフェスト番号
    waste_type: Mapped[str] = mapped_column(String(100), nullable=False)  # コンクリート, 木くず, 金属くず, 廃プラ, etc.
    waste_category: Mapped[str] = mapped_column(String(50), nullable=False)  # general_industrial, special_industrial
    quantity: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20), default="t")  # t, m3, kg
    collector_name: Mapped[str | None] = mapped_column(String(255))  # 収集運搬業者
    collector_license: Mapped[str | None] = mapped_column(String(100))
    disposal_name: Mapped[str | None] = mapped_column(String(255))  # 処分業者
    disposal_license: Mapped[str | None] = mapped_column(String(100))
    disposal_method: Mapped[str | None] = mapped_column(String(100))  # 中間処理, 最終処分, リサイクル
    issued_date: Mapped[date] = mapped_column(Date, nullable=False)
    collected_date: Mapped[date | None] = mapped_column(Date)  # B票返送日
    disposed_date: Mapped[date | None] = mapped_column(Date)  # D票返送日
    final_disposed_date: Mapped[date | None] = mapped_column(Date)  # E票返送日
    status: Mapped[str] = mapped_column(String(50), default="issued")  # issued, collected, disposed, final_disposed, completed
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
