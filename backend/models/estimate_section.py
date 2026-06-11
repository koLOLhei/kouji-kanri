"""G1 階層型見積内訳 大項目モデル

共通仮設/直接仮設/躯体/塗装等の大項目を表す。
Estimate 1:N、自己参照で多階層対応。子 Item の金額をキャッシュ。
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class EstimateSection(Base):
    """見積内訳の大項目 (階層対応)"""
    __tablename__ = "estimate_sections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    estimate_id: Mapped[str] = mapped_column(String(36), ForeignKey("estimates.id"), nullable=False, index=True)
    parent_section_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("estimate_sections.id"), nullable=True)
    code: Mapped[str | None] = mapped_column(String(50))  # 例: A-100
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)  # 階層レベル
    sale_subtotal: Mapped[int] = mapped_column(BigInteger, default=0)  # 子 Item の sale_amount 合計キャッシュ
    cost_subtotal: Mapped[int] = mapped_column(BigInteger, default=0)  # 子 Item の cost_amount 合計キャッシュ
    profit_subtotal: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items = relationship("EstimateItem", back_populates="section", cascade="all, delete-orphan")
