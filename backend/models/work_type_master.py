"""G12 工事種別マスタ (Item の自動入力ソース)

見積項目作成時に code から name / unit / 単価をプリフィルするためのマスタ。
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, BigInteger, Boolean, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class WorkTypeMaster(Base):
    """工事種別マスタ (テナント内でユニーク)"""
    __tablename__ = "work_type_masters"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_work_type_masters_tenant_code"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(100), nullable=False)  # 例: 'concrete_repair'
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))  # 大分類: 共通仮設/直接仮設/躯体/塗装/防水 等
    default_unit: Mapped[str | None] = mapped_column(String(50))
    default_sale_unit_price: Mapped[int] = mapped_column(BigInteger, default=0)
    default_cost_unit_price: Mapped[int] = mapped_column(BigInteger, default=0)
    is_legal_welfare_cost: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
