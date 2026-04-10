"""工種別管理 (Work Package / Trade) — 1施工内の業種区分け + 内外製振り分け"""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, BigInteger, Integer, Float, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class WorkPackage(Base):
    """工種 (例: 躯体工事, 電気工事, 空調工事...)
    1つのProjectに複数のWorkPackageが紐づく。
    """
    __tablename__ = "work_packages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # 工種名: 躯体, 仕上, 電気, 機械, etc.
    trade_code: Mapped[str | None] = mapped_column(String(50))  # 工種コード
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # architecture, electrical, mechanical, plumbing, civil, other
    allocation: Mapped[str] = mapped_column(String(20), default="undecided")  # in_house, outsource, mixed, undecided
    subcontractor_id: Mapped[str | None] = mapped_column(String(36))  # 外注先
    manager_name: Mapped[str | None] = mapped_column(String(255))  # 工種担当者
    # 実行予算
    budget_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # 実行予算額
    contract_amount: Mapped[int | None] = mapped_column(BigInteger)  # 外注契約額 (外注の場合)
    actual_cost: Mapped[int] = mapped_column(BigInteger, default=0)  # 実績原価 (累計)
    # 進捗
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    planned_start: Mapped[date | None] = mapped_column(Date)
    planned_end: Mapped[date | None] = mapped_column(Date)
    actual_start: Mapped[date | None] = mapped_column(Date)
    actual_end: Mapped[date | None] = mapped_column(Date)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MonthlyProgress(Base):
    """月次出来高査定"""
    __tablename__ = "monthly_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    year_month: Mapped[str] = mapped_column(String(7), nullable=False)  # '2026-04'
    work_package_id: Mapped[str | None] = mapped_column(String(36))
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    progress_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # 出来高金額
    payment_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # 支払予定額
    payment_status: Mapped[str] = mapped_column(String(30), default="pending")  # pending, invoiced, paid
    notes: Mapped[str | None] = mapped_column(Text)
    assessed_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DefectRecord(Base):
    """瑕疵・アフターサービス管理"""
    __tablename__ = "defect_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    defect_number: Mapped[str | None] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    work_package_id: Mapped[str | None] = mapped_column(String(36))
    reported_date: Mapped[date] = mapped_column(Date, nullable=False)
    reported_by: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    cause: Mapped[str | None] = mapped_column(Text)
    repair_method: Mapped[str | None] = mapped_column(Text)
    repair_cost: Mapped[int | None] = mapped_column(BigInteger)
    responsible_party: Mapped[str] = mapped_column(String(50), default="contractor")  # contractor, subcontractor, client
    assigned_to: Mapped[str | None] = mapped_column(String(36))
    due_date: Mapped[date | None] = mapped_column(Date)
    completed_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="reported")  # reported, investigating, repairing, completed, closed
    warranty_period_end: Mapped[date | None] = mapped_column(Date)  # 瑕疵担保期限
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
