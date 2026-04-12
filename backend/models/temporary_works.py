"""Temporary works plan (仮設計画) model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class TemporaryWork(Base):
    __tablename__ = "temporary_works"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    work_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # "scaffold" (足場), "hoarding" (仮囲い), "crane" (揚重),
    # "temporary_power" (仮設電気), "temporary_water" (仮設給水), "safety_net" (防護ネット)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    planned_start: Mapped[date | None] = mapped_column(Date)
    planned_end: Mapped[date | None] = mapped_column(Date)
    actual_start: Mapped[date | None] = mapped_column(Date)
    actual_end: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="planned")
    # "planned", "active", "completed", "removed"
    inspector: Mapped[str | None] = mapped_column(String(100))
    inspection_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
