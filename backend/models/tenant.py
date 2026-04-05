"""Tenant model for multi-tenant SaaS."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # 会社名
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    schema_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="standard")  # free, standard, enterprise
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_projects: Mapped[int] = mapped_column(Integer, default=10)
    max_users: Mapped[int] = mapped_column(Integer, default=20)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
