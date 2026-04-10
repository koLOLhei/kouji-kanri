"""Submission (提出書類パッケージ) and DocumentTemplate models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, Text, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Submission(Base):
    """自動生成された提出書類パッケージ"""
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    submission_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    file_key: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, ready, submitted, accepted
    generated_at: Mapped[datetime | None] = mapped_column(DateTime)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    checksum: Mapped[str | None] = mapped_column(String(64))  # SHA-256 hex digest
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DocumentTemplate(Base):
    """地域別書類テンプレート"""
    __tablename__ = "document_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_code: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str | None] = mapped_column(String(100))  # NULL = default
    template_type: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    html_template: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
