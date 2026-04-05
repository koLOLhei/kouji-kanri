"""Multi-level approval workflow models."""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ApprovalFlow(Base):
    """承認フロー: 任意のエンティティに紐づく多段階承認ワークフロー"""
    __tablename__ = "approval_flows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)  # submission, report, inspection, etc.
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    # pending, in_progress, approved, rejected, returned, conditionally_approved
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    total_steps: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[str] = mapped_column(String(36), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ApprovalStep(Base):
    """承認ステップ: フロー内の個別承認ステップ"""
    __tablename__ = "approval_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    flow_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-based
    step_name: Mapped[str] = mapped_column(String(200), nullable=False)
    approver_role: Mapped[str | None] = mapped_column(String(50))  # any user with this role can approve
    approver_id: Mapped[str | None] = mapped_column(String(36))  # specific user override
    approver_name: Mapped[str | None] = mapped_column(String(255))  # denormalized for display
    status: Mapped[str] = mapped_column(String(50), default="pending")
    # pending, approved, rejected, returned, conditionally_approved, skipped
    comment: Mapped[str | None] = mapped_column(Text)
    conditions: Mapped[dict | None] = mapped_column(JSON)  # conditions for conditional approval
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    acted_by: Mapped[str | None] = mapped_column(String(36))   # user who took action
    acted_at: Mapped[datetime | None] = mapped_column(DateTime)
    due_date: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
