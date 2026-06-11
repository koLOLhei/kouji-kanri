"""G6 月別出来高エントリモデル

ProgressRow に紐づく月別出来高 (当月数量・金額・進捗率) を表す。
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Integer, BigInteger, Float, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ProgressEntry(Base):
    """月別出来高エントリ"""
    __tablename__ = "progress_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    row_id: Mapped[str] = mapped_column(String(36), ForeignKey("progress_rows.id"), nullable=False, index=True)
    statement_id: Mapped[str] = mapped_column(String(36), ForeignKey("progress_statements.id"), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    progress_qty: Mapped[Decimal] = mapped_column(Numeric(15, 3), default=0)  # 当月出来高数量
    progress_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # 当月出来高金額
    progress_rate: Mapped[float] = mapped_column(Float, default=0)  # 当月出来高 % (0-1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
