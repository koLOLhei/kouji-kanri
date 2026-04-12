"""Neighborhood relations (近隣対策) model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class NeighborhoodRecord(Base):
    __tablename__ = "neighborhood_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    record_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # "greeting" (挨拶), "complaint" (苦情), "response" (対応), "notice" (通知)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    neighbor_name: Mapped[str | None] = mapped_column(String(200))
    neighbor_address: Mapped[str | None] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    response_action: Mapped[str | None] = mapped_column(Text)
    handled_by: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="open")
    # "open", "responded", "resolved"
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
