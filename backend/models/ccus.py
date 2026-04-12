"""CCUS (建設キャリアアップシステム) record model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Boolean, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class CcusRecord(Base):
    __tablename__ = "ccus_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    worker_id: Mapped[str] = mapped_column(String(36), nullable=False)
    ccus_id: Mapped[str] = mapped_column(String(100), nullable=False)  # CCUS技能者ID
    check_in_time: Mapped[str | None] = mapped_column(String(8))   # "HH:MM:SS"
    check_out_time: Mapped[str | None] = mapped_column(String(8))  # "HH:MM:SS"
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
