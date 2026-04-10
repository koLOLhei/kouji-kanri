"""出来形管理 (Measurement/As-built Management) model."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Float, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Measurement(Base):
    """出来形測定記録"""
    __tablename__ = "measurements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    title: Mapped[str] = mapped_column(String(500), nullable=False)  # e.g. "3階床版 配筋"
    measurement_type: Mapped[str] = mapped_column(String(100), nullable=False)  # dimension, level, rebar_spacing, concrete_cover, etc.
    location: Mapped[str | None] = mapped_column(String(255))
    measured_date: Mapped[date] = mapped_column(Date, nullable=False)
    items: Mapped[dict | None] = mapped_column(JSON)  # [{name, design_value, actual_value, tolerance, unit, result}]
    overall_result: Mapped[str] = mapped_column(String(20), default="pass")  # pass, fail
    measured_by: Mapped[str | None] = mapped_column(String(255))
    photo_ids: Mapped[dict | None] = mapped_column(JSON)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
