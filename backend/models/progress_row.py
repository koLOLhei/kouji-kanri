"""G6 出来高調書 明細行 モデル"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Integer, BigInteger, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class ProgressRow(Base):
    """G6 出来高調書の明細行 (Estimate Item からコピー)"""
    __tablename__ = "progress_rows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    statement_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("progress_statements.id"), nullable=False, index=True
    )
    source_item_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("estimate_items.id"), nullable=True
    )
    source_section_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("estimate_sections.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    specification: Mapped[str | None] = mapped_column(String(1000))
    contract_qty: Mapped[Decimal] = mapped_column(Numeric(15, 3), default=0)
    contract_unit: Mapped[str | None] = mapped_column(String(50))
    contract_unit_price: Mapped[int] = mapped_column(BigInteger, default=0)
    contract_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    cumulative_qty: Mapped[Decimal] = mapped_column(Numeric(15, 3), default=0)
    cumulative_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    entries = relationship("ProgressEntry", cascade="all, delete-orphan")
