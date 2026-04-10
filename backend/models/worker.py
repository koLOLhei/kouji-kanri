"""Worker, qualification, and attendance models."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, Float, Boolean, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_kana: Mapped[str | None] = mapped_column(String(255))
    birth_date: Mapped[date | None] = mapped_column(Date)
    blood_type: Mapped[str | None] = mapped_column(String(10))
    emergency_contact: Mapped[str | None] = mapped_column(String(255))
    emergency_phone: Mapped[str | None] = mapped_column(String(50))
    company_id: Mapped[str | None] = mapped_column(String(36))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    photo_key: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WorkerQualification(Base):
    __tablename__ = "worker_qualifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id: Mapped[str] = mapped_column(String(36), nullable=False)
    qualification_name: Mapped[str] = mapped_column(String(255), nullable=False)
    qualification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    certificate_number: Mapped[str | None] = mapped_column(String(100))
    issued_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    issuing_authority: Mapped[str | None] = mapped_column(String(255))
    certificate_file_key: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Attendance(Base):
    __tablename__ = "attendances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    worker_id: Mapped[str] = mapped_column(String(36), nullable=False)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in: Mapped[datetime | None] = mapped_column(DateTime)
    check_out: Mapped[datetime | None] = mapped_column(DateTime)
    work_hours: Mapped[float | None] = mapped_column(Float)
    work_type: Mapped[str] = mapped_column(String(50), default="regular")
    notes: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
