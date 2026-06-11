"""G10 見積 提案項目 (本見積外で管理、採用時に EstimateSection/Item へ取り込み) モデル"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, BigInteger, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class EstimateProposal(Base):
    """見積 提案項目 (G10)

    本見積には載せず、採用時に EstimateSection/EstimateItem を生成する。
    status: pending / adopted / rejected
    """
    __tablename__ = "estimate_proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    estimate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("estimates.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    specification: Mapped[str | None] = mapped_column(String(1000))
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), default=0)
    unit: Mapped[str | None] = mapped_column(String(50))
    sale_unit_price: Mapped[int] = mapped_column(BigInteger, default=0)
    sale_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    cost_unit_price: Mapped[int] = mapped_column(BigInteger, default=0)
    cost_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending / adopted / rejected
    adopted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    adopted_section_id: Mapped[str | None] = mapped_column(String(36))  # 取込時に作成した section の id
    note: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
