"""G3 面別×階別 数量入力モデル (W×H + 開口部)"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Integer, Numeric, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class EstimateQuantity(Base):
    """見積の面別×階別 数量入力。1 レコード = 1 面 × 1 階。

    gross_area = width * height
    net_area = gross_area - opening_total_area
    tile_count = net_area * tile_per_sqm (既定 200/㎡)
    """
    __tablename__ = "estimate_quantities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    estimate_id: Mapped[str] = mapped_column(String(36), ForeignKey("estimates.id"), nullable=False, index=True)
    face: Mapped[str | None] = mapped_column(String(10))  # 北/南/東/西 or 'N','S','E','W'
    floor: Mapped[int] = mapped_column(Integer, default=1)  # 1F=1, ...
    width: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    height: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    gross_area: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)  # = width * height
    openings: Mapped[list | None] = mapped_column(JSON)  # [{name,width,height,count}, ...]
    opening_total_area: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    net_area: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)  # = gross_area - opening_total_area
    tile_count: Mapped[int] = mapped_column(Integer, default=0)  # = net_area * tile_per_sqm (既定 200)
    sealant_length: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    note: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
