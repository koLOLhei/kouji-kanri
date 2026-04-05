"""品質管理・出来高管理モデル (Quality Control, Stage Confirmation, Progress Payment)."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Float, Integer, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class QualityControlItem(Base):
    """品質管理項目"""
    __tablename__ = "quality_control_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    item_name: Mapped[str] = mapped_column(String(500), nullable=False)  # e.g. "コンクリート圧縮強度"
    control_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "x_bar_r" | "histogram" | "range_check"
    design_value: Mapped[float | None] = mapped_column(Float)
    upper_limit: Mapped[float | None] = mapped_column(Float)
    lower_limit: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(50))  # e.g. "N/mm²", "mm"
    measurement_method: Mapped[str | None] = mapped_column(String(500))
    frequency: Mapped[str | None] = mapped_column(String(255))
    tenant_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QualityMeasurement(Base):
    """品質測定値"""
    __tablename__ = "quality_measurements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    item_id: Mapped[str] = mapped_column(String(36), nullable=False)  # FK to quality_control_items
    measured_value: Mapped[float] = mapped_column(Float, nullable=False)
    measured_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    measured_by: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    lot_number: Mapped[str | None] = mapped_column(String(100))
    sample_number: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    is_passed: Mapped[bool | None] = mapped_column(Boolean)  # auto-calculated
    tenant_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StageConfirmation(Base):
    """段階確認記録"""
    __tablename__ = "stage_confirmations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    confirmation_type: Mapped[str] = mapped_column(String(100), nullable=False)  # "配筋検査", "コンクリート打設前", "鉄骨建方", etc.
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    actual_date: Mapped[date | None] = mapped_column(Date)
    inspector_name: Mapped[str | None] = mapped_column(String(255))
    inspector_org: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(500))
    items_json: Mapped[dict | None] = mapped_column(JSON)  # checklist items with results
    result: Mapped[str | None] = mapped_column(String(50))  # "合格", "条件付合格", "不合格", "再検査"
    photos: Mapped[dict | None] = mapped_column(JSON)  # list of photo_ids
    comments: Mapped[str | None] = mapped_column(Text)
    confirmation_by: Mapped[str | None] = mapped_column(String(255))
    witness_by: Mapped[str | None] = mapped_column(String(255))
    tenant_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProgressPayment(Base):
    """出来高管理 (Progress Payment)"""
    __tablename__ = "progress_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 第N回
    items_json: Mapped[dict | None] = mapped_column(JSON)  # [{item_name, unit, contract_qty, contract_amount, cumulative_qty, cumulative_amount, this_period_qty, this_period_amount, progress_rate}]
    total_contract_amount: Mapped[float | None] = mapped_column(Float)
    total_cumulative_amount: Mapped[float | None] = mapped_column(Float)
    total_this_period: Mapped[float | None] = mapped_column(Float)
    progress_rate: Mapped[float | None] = mapped_column(Float)  # overall %
    status: Mapped[str] = mapped_column(String(50), default="draft")  # "draft", "submitted", "approved"
    approved_by: Mapped[str | None] = mapped_column(String(255))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    tenant_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
