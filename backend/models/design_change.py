"""Design Change (設計変更) model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class DesignChange(Base):
    __tablename__ = "design_changes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    change_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 第N号
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)  # 変更理由
    description: Mapped[str | None] = mapped_column(Text)  # 変更内容
    change_type: Mapped[str] = mapped_column(
        String(50), default="設計変更"
    )  # "設計変更", "数量変更", "工期変更", "追加工事"
    status: Mapped[str] = mapped_column(
        String(30), default="draft"
    )  # "draft", "submitted", "negotiating", "approved", "rejected"
    original_amount: Mapped[float | None] = mapped_column(Float)  # 変更前金額
    changed_amount: Mapped[float | None] = mapped_column(Float)  # 変更後金額
    difference_amount: Mapped[float | None] = mapped_column(Float)  # 増減額
    original_duration: Mapped[int | None] = mapped_column(Integer)  # 変更前工期(日)
    changed_duration: Mapped[int | None] = mapped_column(Integer)  # 変更後工期(日)
    items_json: Mapped[list | None] = mapped_column(JSON)
    # [{item_name, unit, original_qty, changed_qty, unit_price, original_amount, changed_amount}]
    requested_by: Mapped[str | None] = mapped_column(String(255))
    approved_by: Mapped[str | None] = mapped_column(String(255))
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    attachments: Mapped[list | None] = mapped_column(JSON)  # list of file_keys
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
