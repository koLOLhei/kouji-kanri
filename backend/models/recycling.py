"""建設リサイクル法 (Construction Recycling Act) model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Float, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class RecyclingNotice(Base):
    __tablename__ = "recycling_notices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    notice_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # "pre_construction" (事前通知), "completion" (完了報告)
    submission_date: Mapped[date | None] = mapped_column(Date)
    authority: Mapped[str | None] = mapped_column(String(255))  # 届出先
    building_area: Mapped[float | None] = mapped_column(Float)       # 床面積 (m2)
    total_floor_area: Mapped[float | None] = mapped_column(Float)    # 延床面積 (m2)
    demolition_type: Mapped[str | None] = mapped_column(String(100)) # 解体工事の種別
    materials_json: Mapped[list | None] = mapped_column(JSON)
    # [{material: str, estimated_volume: float, unit: str, recycling_method: str}]
    status: Mapped[str] = mapped_column(String(30), default="draft")
    # "draft", "submitted", "accepted", "completed"
    reference_number: Mapped[str | None] = mapped_column(String(100))  # 受理番号
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
