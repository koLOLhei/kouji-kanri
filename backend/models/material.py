"""Material management models."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, BigInteger, Float, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class MaterialOrder(Base):
    __tablename__ = "material_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    order_number: Mapped[str | None] = mapped_column(String(100))
    supplier_name: Mapped[str | None] = mapped_column(String(255))
    order_date: Mapped[date | None] = mapped_column(Date)
    expected_delivery: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="ordered")
    total_amount: Mapped[int | None] = mapped_column(BigInteger)
    notes: Mapped[str | None] = mapped_column(Text)
    ordered_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MaterialOrderItem(Base):
    __tablename__ = "material_order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id: Mapped[str] = mapped_column(String(36), nullable=False)
    material_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specification: Mapped[str | None] = mapped_column(String(500))
    quantity: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(50))
    unit_price: Mapped[int | None] = mapped_column(BigInteger)
    delivered_quantity: Mapped[float] = mapped_column(Float, default=0)
    notes: Mapped[str | None] = mapped_column(String(500))


class MaterialTestRecord(Base):
    __tablename__ = "material_test_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    material_name: Mapped[str] = mapped_column(String(255), nullable=False)
    test_type: Mapped[str] = mapped_column(String(100), nullable=False)
    test_date: Mapped[date | None] = mapped_column(Date)
    test_location: Mapped[str | None] = mapped_column(String(255))
    test_results: Mapped[dict | None] = mapped_column(JSON)
    judgment: Mapped[str] = mapped_column(String(20), default="pass")
    certificate_file_key: Mapped[str | None] = mapped_column(String(500))
    tested_by: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
