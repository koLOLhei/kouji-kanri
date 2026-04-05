"""車両・重機管理 (Equipment Management) model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, Float, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Equipment(Base):
    """車両・重機台帳"""
    __tablename__ = "equipment"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "25tラフタークレーン"
    equipment_type: Mapped[str] = mapped_column(String(100), nullable=False)  # crane, excavator, truck, pump, generator, etc.
    model_number: Mapped[str | None] = mapped_column(String(255))
    registration_number: Mapped[str | None] = mapped_column(String(100))  # ナンバー
    owner_company: Mapped[str | None] = mapped_column(String(255))  # 所有会社
    inspection_date: Mapped[date | None] = mapped_column(Date)  # 車検・検査日
    inspection_expiry: Mapped[date | None] = mapped_column(Date)  # 車検・検査有効期限
    insurance_expiry: Mapped[date | None] = mapped_column(Date)
    capacity: Mapped[str | None] = mapped_column(String(100))  # 能力 (25t, 0.7m3, etc.)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EquipmentDailyCheck(Base):
    """重機始業前点検記録"""
    __tablename__ = "equipment_daily_checks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    check_date: Mapped[date] = mapped_column(Date, nullable=False)
    operator_name: Mapped[str] = mapped_column(String(255), nullable=False)
    checklist: Mapped[dict | None] = mapped_column(JSON)  # [{item, result: ok/ng}]
    overall_result: Mapped[str] = mapped_column(String(20), default="ok")  # ok, ng
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EquipmentUsage(Base):
    """重機使用実績"""
    __tablename__ = "equipment_usage"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    usage_date: Mapped[date] = mapped_column(Date, nullable=False)
    hours: Mapped[float | None] = mapped_column(Float)
    work_description: Mapped[str | None] = mapped_column(Text)
    operator_name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
