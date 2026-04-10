"""工事成績評定 + 全社横串ダッシュボード"""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, Float, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class PerformanceRating(Base):
    """工事成績評定シミュレーション (国交省 65点基準)"""
    __tablename__ = "performance_ratings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    evaluation_date: Mapped[date] = mapped_column(Date, nullable=False)
    # I. 施工体制 (配点: 適切20, やや不適切12, 不適切4)
    construction_system_score: Mapped[int] = mapped_column(Integer, default=16)  # /20
    construction_system_notes: Mapped[str | None] = mapped_column(Text)
    # II. 施工状況 (配点: max 38.4)
    schedule_management: Mapped[int] = mapped_column(Integer, default=6)  # /10 工程管理
    safety_management: Mapped[int] = mapped_column(Integer, default=6)  # /10 安全管理
    worker_management: Mapped[int] = mapped_column(Integer, default=3)  # /5 対外関係
    # III. 出来形・品質 (配点: max 32.6)
    quality_score: Mapped[int] = mapped_column(Integer, default=20)  # /30 出来形品質
    as_built_accuracy: Mapped[int] = mapped_column(Integer, default=5)  # /10 出来形精度
    # IV. 技術提案・社会性 (加点: max 10)
    technical_proposal: Mapped[int] = mapped_column(Integer, default=0)  # VE提案
    social_contribution: Mapped[int] = mapped_column(Integer, default=0)  # 地域貢献等
    # 合計
    total_score: Mapped[float] = mapped_column(Float, default=65)
    grade: Mapped[str | None] = mapped_column(String(10))  # A(80+), B(70-79), C(60-69), D(<60)
    # 詳細
    details: Mapped[dict | None] = mapped_column(JSON)
    evaluated_by: Mapped[str | None] = mapped_column(String(36))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CashFlow(Base):
    """キャッシュフロー管理 — 月次の入出金"""
    __tablename__ = "cash_flows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    year_month: Mapped[str] = mapped_column(String(7), nullable=False)
    # 入金
    progress_payment_received: Mapped[int] = mapped_column(Integer, default=0)  # 出来高入金
    other_income: Mapped[int] = mapped_column(Integer, default=0)
    # 出金
    material_payment: Mapped[int] = mapped_column(Integer, default=0)  # 材料支払
    subcontractor_payment: Mapped[int] = mapped_column(Integer, default=0)  # 下請支払
    labor_cost: Mapped[int] = mapped_column(Integer, default=0)  # 労務費
    equipment_cost: Mapped[int] = mapped_column(Integer, default=0)  # 機械経費
    overhead: Mapped[int] = mapped_column(Integer, default=0)  # 共通仮設・現場経費
    other_expense: Mapped[int] = mapped_column(Integer, default=0)
    # 差引
    net_cash_flow: Mapped[int] = mapped_column(Integer, default=0)  # 当月差引
    cumulative_cash_flow: Mapped[int] = mapped_column(Integer, default=0)  # 累計
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ScheduleDelay(Base):
    """工期遅延分析"""
    __tablename__ = "schedule_delays"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    delay_days: Mapped[int] = mapped_column(Integer, nullable=False)
    delay_cause: Mapped[str] = mapped_column(String(50), nullable=False)  # weather, material, labor, design_change, subcontractor, client, other
    description: Mapped[str | None] = mapped_column(Text)
    impact_on_completion: Mapped[bool] = mapped_column(default=False)  # 全体工期への影響有無
    mitigation: Mapped[str | None] = mapped_column(Text)  # 挽回策
    recorded_date: Mapped[date] = mapped_column(Date, nullable=False)
    recorded_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
