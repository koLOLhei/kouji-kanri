"""建退共 (建設業退職金共済) record model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class RetirementMutualAidRecord(Base):
    __tablename__ = "retirement_mutual_aid_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    worker_id: Mapped[str] = mapped_column(String(36), nullable=False)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    days_count: Mapped[int] = mapped_column(Integer, default=1)   # 従事日数
    stamp_count: Mapped[int] = mapped_column(Integer, default=1)  # 証紙枚数
    verified_by: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
