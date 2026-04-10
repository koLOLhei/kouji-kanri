"""Subcontractor and contract models."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, BigInteger, Integer, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Subcontractor(Base):
    __tablename__ = "subcontractors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name_kana: Mapped[str | None] = mapped_column(String(255))
    representative: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    fax: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    registration_number: Mapped[str | None] = mapped_column(String(100))
    registration_category: Mapped[str | None] = mapped_column(String(100))
    insurance_info: Mapped[dict | None] = mapped_column(JSON)
    capital: Mapped[int | None] = mapped_column(BigInteger)
    employee_count: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SubcontractorContract(Base):
    __tablename__ = "subcontractor_contracts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    subcontractor_id: Mapped[str] = mapped_column(String(36), nullable=False)
    contract_type: Mapped[str] = mapped_column(String(50), default="primary")
    parent_contract_id: Mapped[str | None] = mapped_column(String(36))
    work_scope: Mapped[str | None] = mapped_column(Text)
    contract_amount: Mapped[int | None] = mapped_column(BigInteger)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    site_manager_name: Mapped[str | None] = mapped_column(String(255))
    safety_manager_name: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
