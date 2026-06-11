"""G9 外部仕上書 / 内部仕上書マトリクスモデル"""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class FinishMatrixEntry(Base):
    """外部/内部仕上書マトリクスのエントリ (部屋×部位×仕様)"""
    __tablename__ = "finish_matrix_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id"),
        nullable=False,
        index=True,
    )
    matrix_type: Mapped[str] = mapped_column(String(30), nullable=False)  # exterior / interior
    floor: Mapped[str | None] = mapped_column(String(50))  # '1F' or 'all'
    location: Mapped[str | None] = mapped_column(String(255))  # 場所/部屋名
    part: Mapped[str | None] = mapped_column(String(100))  # 床/壁/天井/外壁/開口部 等
    spec_text: Mapped[str | None] = mapped_column(String(1000))  # 仕様
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
