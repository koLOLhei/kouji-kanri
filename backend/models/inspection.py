"""Inspection management models."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    inspection_type: Mapped[str] = mapped_column(String(50), nullable=False)  # internal, witness, intermediate, completion
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    actual_date: Mapped[date | None] = mapped_column(Date)
    inspector_name: Mapped[str | None] = mapped_column(String(255))
    inspector_organization: Mapped[str | None] = mapped_column(String(255))
    result: Mapped[str] = mapped_column(String(50), default="pending")
    remarks: Mapped[str | None] = mapped_column(Text)
    photo_ids: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(50), default="scheduled")
    created_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InspectionChecklist(Base):
    __tablename__ = "inspection_checklists"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inspection_id: Mapped[str] = mapped_column(String(36), nullable=False)
    category: Mapped[str | None] = mapped_column(String(255))
    item_name: Mapped[str] = mapped_column(String(500), nullable=False)
    standard: Mapped[str | None] = mapped_column(String(500))
    result: Mapped[str] = mapped_column(String(20), default="pending")
    measured_value: Mapped[str | None] = mapped_column(String(255))
    comment: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
