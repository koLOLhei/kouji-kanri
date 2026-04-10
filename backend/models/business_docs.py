"""見積書・請求書・支払通知・契約書・入札・届出・タスク等のビジネス文書モデル"""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, BigInteger, Float, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Estimate(Base):
    """見積書"""
    __tablename__ = "estimates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    estimate_number: Mapped[str | None] = mapped_column(String(50))
    project_name: Mapped[str] = mapped_column(String(500), nullable=False)
    customer_id: Mapped[str | None] = mapped_column(String(36))
    customer_name: Mapped[str | None] = mapped_column(String(255))
    items: Mapped[dict | None] = mapped_column(JSON)  # [{name, spec, qty, unit, unit_price, amount}]
    subtotal: Mapped[int] = mapped_column(BigInteger, default=0)
    tax_rate: Mapped[float] = mapped_column(Float, default=10.0)
    tax_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    total: Mapped[int] = mapped_column(BigInteger, default=0)
    valid_until: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft, sent, accepted, rejected, expired
    notes: Mapped[str | None] = mapped_column(Text)
    file_key: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Invoice(Base):
    """請求書（出来高ベース）"""
    __tablename__ = "invoices"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    invoice_number: Mapped[str | None] = mapped_column(String(50))
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    customer_name: Mapped[str | None] = mapped_column(String(255))
    period_from: Mapped[date | None] = mapped_column(Date)
    period_to: Mapped[date | None] = mapped_column(Date)
    items: Mapped[dict | None] = mapped_column(JSON)  # [{description, amount}]
    subtotal: Mapped[int] = mapped_column(BigInteger, default=0)
    tax_rate: Mapped[float] = mapped_column(Float, default=10.0)
    tax_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    total: Mapped[int] = mapped_column(BigInteger, default=0)
    invoice_registration_number: Mapped[str | None] = mapped_column(String(50))  # インボイス番号 T+13桁
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft, sent, paid, overdue
    paid_date: Mapped[date | None] = mapped_column(Date)
    file_key: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PaymentNotice(Base):
    """支払通知書（下請向け）"""
    __tablename__ = "payment_notices"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    subcontractor_id: Mapped[str] = mapped_column(String(36), nullable=False)
    notice_number: Mapped[str | None] = mapped_column(String(50))
    period_from: Mapped[date | None] = mapped_column(Date)
    period_to: Mapped[date | None] = mapped_column(Date)
    items: Mapped[dict | None] = mapped_column(JSON)
    subtotal: Mapped[int] = mapped_column(BigInteger, default=0)
    tax_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    total: Mapped[int] = mapped_column(BigInteger, default=0)
    payment_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ContractDocument(Base):
    """契約書管理"""
    __tablename__ = "contract_documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str | None] = mapped_column(String(36))
    contract_type: Mapped[str] = mapped_column(String(50), nullable=False)  # prime(元請), sub(下請), consulting, maintenance
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    counterparty: Mapped[str | None] = mapped_column(String(255))
    contract_amount: Mapped[int | None] = mapped_column(BigInteger)
    signed_date: Mapped[date | None] = mapped_column(Date)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    file_key: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft, signed, active, expired, terminated
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class GovernmentFiling(Base):
    """官公庁届出管理"""
    __tablename__ = "government_filings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    filing_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # road_use(道路使用許可), construction_notification(建設工事届), recycling(建設リサイクル法),
    # noise(騒音規制), vibration(振動規制), crane(クレーン設置届), scaffolding(足場設置届), asbestos(石綿事前調査)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    authority: Mapped[str | None] = mapped_column(String(255))  # 届出先
    due_date: Mapped[date | None] = mapped_column(Date)
    filed_date: Mapped[date | None] = mapped_column(Date)
    approval_date: Mapped[date | None] = mapped_column(Date)
    permit_number: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending, filed, approved, rejected
    file_key: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EnvironmentRecord(Base):
    """騒音・振動・WBGT等の環境測定記録"""
    __tablename__ = "environment_records"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    record_type: Mapped[str] = mapped_column(String(50), nullable=False)  # noise(騒音), vibration(振動), wbgt(暑さ指数), dust(粉塵)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    record_time: Mapped[str | None] = mapped_column(String(10))  # "09:00"
    location: Mapped[str | None] = mapped_column(String(255))
    measured_value: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(20))  # dB, mm/s, ℃, mg/m3
    limit_value: Mapped[float | None] = mapped_column(Float)  # 規制値
    is_over_limit: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class HandoverItem(Base):
    """引渡品目管理（鍵・取説・保証書等）"""
    __tablename__ = "handover_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)  # key(鍵), manual(取扱説明書), warranty(保証書), certificate(検査証), spare_part(予備品)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    location: Mapped[str | None] = mapped_column(String(255))  # 設置場所/保管場所
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    warranty_until: Mapped[date | None] = mapped_column(Date)  # 保証期限
    file_key: Mapped[str | None] = mapped_column(String(500))  # スキャンPDF
    handed_over: Mapped[bool] = mapped_column(Boolean, default=False)
    handed_over_date: Mapped[date | None] = mapped_column(Date)
    received_by: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MaterialTraceability(Base):
    """材料トレーサビリティ — どの材料がどこに使われたか"""
    __tablename__ = "material_traceability"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    material_name: Mapped[str] = mapped_column(String(255), nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    lot_number: Mapped[str | None] = mapped_column(String(100))
    delivery_date: Mapped[date | None] = mapped_column(Date)
    used_location: Mapped[str | None] = mapped_column(String(255))  # 使用箇所
    used_phase_id: Mapped[str | None] = mapped_column(String(36))
    quantity_used: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(20))
    test_record_id: Mapped[str | None] = mapped_column(String(36))  # 材料試験記録への紐付け
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserTask(Base):
    """個人タスク管理"""
    __tablename__ = "user_tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str | None] = mapped_column(String(36))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(10), default="medium")  # high, medium, low
    due_date: Mapped[date | None] = mapped_column(Date)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SystemAnnouncement(Base):
    """お知らせ・リリースノート"""
    __tablename__ = "system_announcements"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    announcement_type: Mapped[str] = mapped_column(String(30), default="info")  # info, feature, maintenance, urgent
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
