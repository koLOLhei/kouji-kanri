"""Cost management models (budget, actuals, forecasts)."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, BigInteger, Date, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from database import Base

# Threshold in JPY above which an actual cost entry requires manager approval
APPROVAL_THRESHOLD = 100_000


class CostBudget(Base):
    __tablename__ = "cost_budgets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(255))
    budgeted_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CostActual(Base):
    __tablename__ = "cost_actuals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(255))
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    expense_date: Mapped[date | None] = mapped_column(Date)
    vendor_name: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    receipt_file_key: Mapped[str | None] = mapped_column(String(500))
    recorded_by: Mapped[str | None] = mapped_column(String(36))
    # Approval workflow fields
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(String(36))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CostForecast(Base):
    __tablename__ = "cost_forecasts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_budget: Mapped[int] = mapped_column(BigInteger, default=0)
    total_spent: Mapped[int] = mapped_column(BigInteger, default=0)
    estimated_total: Mapped[int] = mapped_column(BigInteger, default=0)
    variance: Mapped[int] = mapped_column(BigInteger, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
