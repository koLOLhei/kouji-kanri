"""G4 見積条件 (約款) テンプレート モデル"""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class EstimateConditionTemplate(Base):
    """見積条件 (約款) テンプレート"""
    __tablename__ = "estimate_condition_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_type: Mapped[str | None] = mapped_column(String(50))  # 'renovation', 'new_construction', 'painting' など
    body_html: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
