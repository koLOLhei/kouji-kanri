"""G12 案件種別テンプレ + 標準セクション モデル"""

import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ProjectTypeTemplate(Base):
    """案件種別テンプレート (標準セクション付き)"""
    __tablename__ = "project_type_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_type: Mapped[str | None] = mapped_column(String(50))  # 'renovation', 'new_construction', 'painting', 'interior' など
    default_sections: Mapped[list | None] = mapped_column(JSON)  # [{name, code, items: [{work_type_code, ...}]}, ...]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
