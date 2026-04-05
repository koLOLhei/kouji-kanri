"""Report (報告書・試験結果) model."""

import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    requirement_id: Mapped[str | None] = mapped_column(String(36))
    report_type: Mapped[str] = mapped_column(String(100), nullable=False)  # inspection, test_result, approval, daily_report
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    file_key: Mapped[str | None] = mapped_column(String(500))
    data: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, submitted, approved, rejected
    submitted_by: Mapped[str | None] = mapped_column(String(36))
    reviewed_by: Mapped[str | None] = mapped_column(String(36))
    checksum: Mapped[str | None] = mapped_column(String(64))  # SHA-256 hex digest
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
