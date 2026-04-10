"""Daily report (日報) model."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, Float, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    weather_morning: Mapped[str | None] = mapped_column(String(20))
    weather_afternoon: Mapped[str | None] = mapped_column(String(20))
    temperature_max: Mapped[float | None] = mapped_column(Float)
    temperature_min: Mapped[float | None] = mapped_column(Float)
    work_description: Mapped[str | None] = mapped_column(Text)
    worker_count: Mapped[int | None] = mapped_column(Integer)
    equipment_used: Mapped[dict | None] = mapped_column(JSON)
    special_notes: Mapped[str | None] = mapped_column(Text)
    safety_notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    submitted_by: Mapped[str | None] = mapped_column(String(36))
    approved_by: Mapped[str | None] = mapped_column(String(36))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
