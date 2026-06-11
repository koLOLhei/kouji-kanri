"""G14 見積承認ワークフロー履歴モデル"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class EstimateApproval(Base):
    """見積の承認ワークフロー履歴 (submitted/approved/rejected/withdrawn)"""
    __tablename__ = "estimate_approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    estimate_id: Mapped[str] = mapped_column(String(36), ForeignKey("estimates.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(30), nullable=False)  # submitted/approved/rejected/withdrawn
    actor_user_id: Mapped[str | None] = mapped_column(String(36))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
