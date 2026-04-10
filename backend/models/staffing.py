"""人員配置計画 — 山積み・山崩し + 全社横串の原価管理"""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, BigInteger, Float, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class StaffAssignment(Base):
    """人員配置: 誰がどの案件にいつからいつまで"""
    __tablename__ = "staff_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(36))  # システムユーザー
    worker_id: Mapped[str | None] = mapped_column(String(36))  # 作業員
    worker_name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)  # 現場代理人, 主任技術者, 監理技術者, 作業員, etc.
    allocation_percent: Mapped[int] = mapped_column(Integer, default=100)  # 工事専任率 (100=専任, 50=兼務)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    daily_cost: Mapped[int | None] = mapped_column(Integer)  # 日当
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LegalInspection(Base):
    """法定検査管理 — 確認申請・中間検査・完了検査"""
    __tablename__ = "legal_inspections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    inspection_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Types: building_confirmation(確認申請), interim(中間検査), completion(完了検査),
    #        fire_inspection(消防検査), use_approval(使用承認)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    authority: Mapped[str | None] = mapped_column(String(255))  # 審査機関 (指定確認検査機関名)
    application_date: Mapped[date | None] = mapped_column(Date)  # 申請日
    certificate_number: Mapped[str | None] = mapped_column(String(100))  # 確認済証番号, 合格証番号
    certificate_date: Mapped[date | None] = mapped_column(Date)  # 交付日
    scheduled_date: Mapped[date | None] = mapped_column(Date)  # 検査予定日
    actual_date: Mapped[date | None] = mapped_column(Date)  # 検査実施日
    result: Mapped[str] = mapped_column(String(50), default="pending")  # pending, passed, failed, conditional
    conditions: Mapped[str | None] = mapped_column(Text)  # 指摘事項・条件
    file_key: Mapped[str | None] = mapped_column(String(500))  # 証書ファイル
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MaterialApproval(Base):
    """材料承認願"""
    __tablename__ = "material_approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    approval_number: Mapped[str | None] = mapped_column(String(50))
    material_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specification: Mapped[str | None] = mapped_column(String(500))  # 規格
    manufacturer: Mapped[str | None] = mapped_column(String(255))  # メーカー
    product_name: Mapped[str | None] = mapped_column(String(255))  # 商品名
    usage_location: Mapped[str | None] = mapped_column(String(255))  # 使用箇所
    quantity: Mapped[str | None] = mapped_column(String(100))
    catalog_file_key: Mapped[str | None] = mapped_column(String(500))  # カタログ
    sample_file_key: Mapped[str | None] = mapped_column(String(500))  # 見本写真
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, submitted, approved, rejected, conditional
    submitted_date: Mapped[date | None] = mapped_column(Date)
    approved_date: Mapped[date | None] = mapped_column(Date)
    approved_by: Mapped[str | None] = mapped_column(String(255))  # 承認者（監督員名）
    conditions: Mapped[str | None] = mapped_column(Text)  # 条件付き承認の場合
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class NeighborRecord(Base):
    """近隣対策・苦情記録"""
    __tablename__ = "neighbor_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    record_type: Mapped[str] = mapped_column(String(50), nullable=False)  # explanation(説明会), complaint(苦情), visit(訪問), notice(通知)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    resident_name: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    content: Mapped[str | None] = mapped_column(Text)  # 内容
    response: Mapped[str | None] = mapped_column(Text)  # 対応内容
    status: Mapped[str] = mapped_column(String(50), default="open")  # open, resolved, monitoring
    resolved_date: Mapped[date | None] = mapped_column(Date)
    handled_by: Mapped[str | None] = mapped_column(String(36))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WeeklyRestDay(Base):
    """週休2日実施状況"""
    __tablename__ = "weekly_rest_days"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    year_month: Mapped[str] = mapped_column(String(7), nullable=False)  # '2026-04'
    total_days: Mapped[int] = mapped_column(Integer, nullable=False)  # 月の日数
    working_days: Mapped[int] = mapped_column(Integer, nullable=False)  # 作業日数
    rest_days: Mapped[int] = mapped_column(Integer, nullable=False)  # 休日数
    rain_days: Mapped[int] = mapped_column(Integer, default=0)  # 雨天休日
    rest_day_rate: Mapped[float | None] = mapped_column(Float)  # 休日取得率 %
    four_week_eight_rest: Mapped[bool] = mapped_column(default=False)  # 4週8休達成
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
