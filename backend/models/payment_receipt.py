"""入金記録・売掛(AR)管理 — 請求書への入金消込。

請求書(Invoice)に対する入金を記録し、残高(売掛)・滞留(aging)を把握する。
1請求書に複数入金（分割入金）可。invoice_id が null の入金は未充当として扱う。
"""

import uuid
from datetime import datetime, date

from sqlalchemy import String, BigInteger, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class PaymentReceipt(Base):
    """入金記録"""
    __tablename__ = "payment_receipts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    project_id: Mapped[str | None] = mapped_column(String(36), index=True)
    # 充当先の請求書（未充当は null）
    invoice_id: Mapped[str | None] = mapped_column(String(36), index=True)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # 入金額（税込）
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str | None] = mapped_column(String(30))  # 振込 / 現金 / 手形 / 相殺 / その他
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
