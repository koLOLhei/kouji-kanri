"""建設ローン — 管理組合向け分割払い、担保管理、広告枠管理"""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, BigInteger, Float, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ConstructionLoan(Base):
    """建設ローン契約"""
    __tablename__ = "construction_loans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # 契約情報
    loan_number: Mapped[str | None] = mapped_column(String(50))
    borrower_name: Mapped[str] = mapped_column(String(255), nullable=False)  # 管理組合名
    total_construction_cost: Mapped[int] = mapped_column(BigInteger, nullable=False)  # 工事総額
    upfront_payment: Mapped[int] = mapped_column(BigInteger, default=0)  # 着手金（半金等）
    upfront_payment_rate: Mapped[float | None] = mapped_column(Float)  # 着手金率(%)
    loan_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # ローン残額
    # 返済条件（案件ごとに設定）
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False)  # 年利(%)
    interest_type: Mapped[str] = mapped_column(String(20), default="fixed")  # fixed(固定), variable(変動)
    repayment_months: Mapped[int] = mapped_column(Integer, nullable=False)  # 返済期間（月数）
    monthly_payment: Mapped[int | None] = mapped_column(BigInteger)  # 月額返済額
    repayment_start_date: Mapped[date | None] = mapped_column(Date)
    # 担保
    collateral_type: Mapped[str | None] = mapped_column(String(50))  # property(不動産), room(部屋)
    collateral_description: Mapped[str | None] = mapped_column(Text)  # 担保内容の詳細
    collateral_value: Mapped[int | None] = mapped_column(BigInteger)  # 担保評価額
    # 外壁広告枠
    ad_space_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    ad_space_location: Mapped[str | None] = mapped_column(String(255))  # 広告枠の位置
    ad_space_size: Mapped[str | None] = mapped_column(String(100))  # サイズ（例: 2m×3m）
    ad_space_start_date: Mapped[date | None] = mapped_column(Date)
    ad_space_end_date: Mapped[date | None] = mapped_column(Date)  # 返済完了時に返還
    # ステータス
    status: Mapped[str] = mapped_column(String(30), default="draft")
    # draft, active, repaying, completed, defaulted, seized
    total_paid: Mapped[int] = mapped_column(BigInteger, default=0)  # 返済済み累計
    remaining_balance: Mapped[int] = mapped_column(BigInteger, default=0)
    last_payment_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoanPayment(Base):
    """ローン返済記録"""
    __tablename__ = "loan_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    loan_id: Mapped[str] = mapped_column(String(36), nullable=False)
    payment_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 回数
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    principal: Mapped[int] = mapped_column(BigInteger, default=0)  # 元金
    interest: Mapped[int] = mapped_column(BigInteger, default=0)  # 利息
    total: Mapped[int] = mapped_column(BigInteger, default=0)  # 合計
    remaining_after: Mapped[int] = mapped_column(BigInteger, default=0)  # 支払後残高
    status: Mapped[str] = mapped_column(String(20), default="scheduled")  # scheduled, paid, overdue
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
