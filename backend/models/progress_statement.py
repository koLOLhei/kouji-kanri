"""G6 出来高調書ヘッダー (月次) モデル"""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class ProgressStatement(Base):
    """出来高調書ヘッダー (月次)"""
    __tablename__ = "progress_statements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    estimate_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("estimates.id"))
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-12
    period_label: Mapped[str | None] = mapped_column(String(50))  # 例: '2026年5月'
    title: Mapped[str | None] = mapped_column(String(255))  # 例: '第1回 出来高調書'
    version: Mapped[str] = mapped_column(String(30), default="initial")  # initial/change/final
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft/finalized
    total_progress_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # 当月小計キャッシュ
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    rows = relationship("ProgressRow", cascade="all, delete-orphan", backref="statement")
