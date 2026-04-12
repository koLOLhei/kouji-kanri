"""Compliance management model (許認可・届出管理)."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ComplianceItem(Base):
    """許認可・届出管理アイテム"""
    __tablename__ = "compliance_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # Classification
    item_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    # e.g. "road_occupancy", "building_permit", "noise_permit",
    #      "waste_disposal", "scaffolding", "crane_setup",
    #      "vibration_permit", "dust_measures", "fire_prevention"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    authority: Mapped[str] = mapped_column(String(200), nullable=False)  # 提出先
    deadline: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="not_started")
    # Statuses: "not_started", "preparing", "submitted", "approved", "expired"

    reference_number: Mapped[str | None] = mapped_column(String(100))  # 許可番号
    notes: Mapped[str | None] = mapped_column(Text)
    attachments: Mapped[dict | None] = mapped_column(JSON)
    # [{filename, file_key, uploaded_at}]

    created_by: Mapped[str | None] = mapped_column(String(36))
    updated_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
