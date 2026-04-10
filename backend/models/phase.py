"""Phase/Process (工程) models."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, Boolean, Date, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Phase(Base):
    __tablename__ = "phases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    spec_chapter_id: Mapped[str | None] = mapped_column(String(36))
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    phase_code: Mapped[str | None] = mapped_column(String(50))
    parent_phase_id: Mapped[str | None] = mapped_column(String(36))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="not_started")
    planned_start: Mapped[date | None] = mapped_column(Date)
    planned_end: Mapped[date | None] = mapped_column(Date)
    actual_start: Mapped[date | None] = mapped_column(Date)
    actual_end: Mapped[date | None] = mapped_column(Date)
    duration_days: Mapped[int | None] = mapped_column(Integer)
    depends_on: Mapped[list | None] = mapped_column(JSON)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PhaseRequirement(Base):
    """工程ごとの必要書類定義"""
    __tablename__ = "phase_requirements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phase_id: Mapped[str] = mapped_column(String(36), nullable=False)
    requirement_type: Mapped[str] = mapped_column(String(50), nullable=False)  # photo, report, test_result, approval
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    min_count: Mapped[int] = mapped_column(Integer, default=1)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
