"""G1/G2 階層型内訳の細目 (見積項目) モデル

売上 (sale_*) と原価 (cost_*) を 2 系統持ち、粗利を派生計算する。
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Integer, BigInteger, Float, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class EstimateItem(Base):
    """見積内訳の細目 (G1/G2 の最下層項目)"""
    __tablename__ = "estimate_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    section_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("estimate_sections.id"),
        nullable=False,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    specification: Mapped[str | None] = mapped_column(String(1000))  # 仕様
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), default=0)
    unit: Mapped[str | None] = mapped_column(String(50))
    # 売上系
    sale_unit_price: Mapped[int] = mapped_column(BigInteger, default=0)
    sale_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # = quantity * sale_unit_price (サーバ計算)
    # 原価系
    cost_unit_price: Mapped[int] = mapped_column(BigInteger, default=0)
    cost_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    # 粗利 (派生)
    profit_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # = sale_amount - cost_amount
    profit_rate: Mapped[float] = mapped_column(Float, default=0)
    # G3 トレース
    quantity_source_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("estimate_quantities.id"),
        nullable=True,
    )
    work_type_code: Mapped[str | None] = mapped_column(String(100))  # work_type_master.code とゆるく紐付け
    note: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    section = relationship("EstimateSection", back_populates="items")
