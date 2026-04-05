"""Subcontractor Evaluation (協力業者評価) model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, Float, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class SubcontractorEvaluation(Base):
    __tablename__ = "subcontractor_evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    subcontractor_id: Mapped[str] = mapped_column(String(36), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    evaluation_period_start: Mapped[date | None] = mapped_column(Date)
    evaluation_period_end: Mapped[date | None] = mapped_column(Date)
    safety_score: Mapped[int | None] = mapped_column(Integer)       # 1-5 安全管理
    quality_score: Mapped[int | None] = mapped_column(Integer)      # 1-5 品質管理
    schedule_score: Mapped[int | None] = mapped_column(Integer)     # 1-5 工程管理
    cooperation_score: Mapped[int | None] = mapped_column(Integer)  # 1-5 協調性
    overall_score: Mapped[float | None] = mapped_column(Float)      # 平均点
    comments: Mapped[str | None] = mapped_column(Text)
    evaluated_by: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
