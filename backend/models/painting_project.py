"""戸建てサイリング塗装工事 — 現地調査〜見積〜契約〜施工〜報告の一気通貫

設計思想:
- ヒアリング情報から契約書+別紙を自動生成
- 工程表を自動生成
- 全データ永続（発注先、責任者、請求書、建材、契約書）
- クライアントがリアルタイムで進捗確認
"""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, BigInteger, Float, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class PaintingSurvey(Base):
    """現地調査・ヒアリング記録"""
    __tablename__ = "painting_surveys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str | None] = mapped_column(String(36))  # 案件化後に紐付け
    # クライアント情報
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_address: Mapped[str | None] = mapped_column(Text)
    client_phone: Mapped[str | None] = mapped_column(String(50))
    client_email: Mapped[str | None] = mapped_column(String(255))
    # 建物情報
    building_type: Mapped[str | None] = mapped_column(String(50))  # detached(戸建), apartment, etc.
    building_age: Mapped[int | None] = mapped_column(Integer)  # 築年数
    floors: Mapped[int | None] = mapped_column(Integer)  # 階数
    structure: Mapped[str | None] = mapped_column(String(50))  # wood, rc, steel
    # 計測データ
    wall_area_m2: Mapped[float | None] = mapped_column(Float)  # 塗装面積 ㎡
    window_area_m2: Mapped[float | None] = mapped_column(Float)  # 窓面積（引く分）
    net_painting_area_m2: Mapped[float | None] = mapped_column(Float)  # 実塗装面積
    caulking_length_m: Mapped[float | None] = mapped_column(Float)  # コーキング長さ m
    roof_area_m2: Mapped[float | None] = mapped_column(Float)  # 屋根面積 ㎡
    # 現状の劣化
    current_condition: Mapped[dict | None] = mapped_column(JSON)
    # {cracks: bool, peeling: bool, fading: bool, mold: bool, rust: bool, water_damage: bool, notes: str}
    # 写真
    survey_photo_ids: Mapped[dict | None] = mapped_column(JSON)  # 現地調査時の写真ID
    # ヒアリング内容
    client_requests: Mapped[str | None] = mapped_column(Text)  # お客様の要望
    preferred_colors: Mapped[str | None] = mapped_column(String(500))  # 希望色
    budget_range: Mapped[str | None] = mapped_column(String(100))  # 予算感
    preferred_timing: Mapped[str | None] = mapped_column(String(100))  # 希望時期
    # 担当
    surveyor_name: Mapped[str | None] = mapped_column(String(255))
    survey_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft, completed, quoted, contracted
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PaintingEstimate(Base):
    """塗装見積書"""
    __tablename__ = "painting_estimates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    survey_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str | None] = mapped_column(String(36))
    estimate_number: Mapped[str | None] = mapped_column(String(50))
    # 塗装項目（単価設定可能）
    items: Mapped[dict | None] = mapped_column(JSON)
    # [{name, area_m2, unit_price, amount, paint_type, manufacturer, product_name}]
    # 例: [{name: "外壁塗装(シリコン)", area_m2: 120, unit_price: 3500, amount: 420000, ...}]
    # 足場/作業車
    scaffold_type: Mapped[str | None] = mapped_column(String(50))  # scaffold(足場), aerial_lift(作業車)
    scaffold_vendor: Mapped[str | None] = mapped_column(String(255))  # 発注先
    scaffold_cost: Mapped[int | None] = mapped_column(BigInteger)
    # コーキング
    caulking_items: Mapped[dict | None] = mapped_column(JSON)
    # [{type, length_m, unit_price, amount}]
    # 金額
    material_cost: Mapped[int] = mapped_column(BigInteger, default=0)  # 材料費（こちら持ち）
    labor_cost: Mapped[int] = mapped_column(BigInteger, default=0)  # 施工費
    subtotal: Mapped[int] = mapped_column(BigInteger, default=0)
    tax_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    total: Mapped[int] = mapped_column(BigInteger, default=0)
    # 下請見積
    subcontractor_name: Mapped[str | None] = mapped_column(String(255))
    subcontractor_quote: Mapped[int | None] = mapped_column(BigInteger)  # 下請からの見積額
    our_quote: Mapped[int | None] = mapped_column(BigInteger)  # 自社見積額
    margin: Mapped[int | None] = mapped_column(BigInteger)  # 粗利
    # 状態
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft, sent, negotiating, accepted, rejected
    valid_until: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PaintingContract(Base):
    """塗装工事契約（電子契約対応）"""
    __tablename__ = "painting_contracts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    survey_id: Mapped[str] = mapped_column(String(36), nullable=False)
    estimate_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str | None] = mapped_column(String(36))
    contract_number: Mapped[str | None] = mapped_column(String(50))
    # 契約内容（ヒアリング+見積から自動生成）
    contract_html: Mapped[str | None] = mapped_column(Text)  # 契約書本文HTML
    appendix_html: Mapped[str | None] = mapped_column(Text)  # 別紙（工事内容詳細）HTML
    template_id: Mapped[str | None] = mapped_column(String(36))  # 使用テンプレート
    # 支払条件（案件ごとに設定可能）
    payment_schedule: Mapped[dict | None] = mapped_column(JSON)
    # [{label: "着手金", rate: 40, amount: 400000, due_date: "2026-05-01", status: "pending"}]
    total_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    # 電子契約
    client_email: Mapped[str | None] = mapped_column(String(255))
    sign_token: Mapped[str | None] = mapped_column(String(128))  # 署名用トークン
    client_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    client_signed_at: Mapped[datetime | None] = mapped_column(DateTime)
    client_ip: Mapped[str | None] = mapped_column(String(50))
    company_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    company_signed_at: Mapped[datetime | None] = mapped_column(DateTime)
    # 工期
    construction_start: Mapped[date | None] = mapped_column(Date)
    construction_end: Mapped[date | None] = mapped_column(Date)
    # 状態
    status: Mapped[str] = mapped_column(String(30), default="draft")
    # draft, sent, client_signed, both_signed, active, completed, cancelled
    file_key: Mapped[str | None] = mapped_column(String(500))  # 署名済みPDF
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ContractTemplate(Base):
    """契約書テンプレート（ドキュメントデータで更新可能）"""
    __tablename__ = "contract_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # テンプレート名
    template_type: Mapped[str] = mapped_column(String(50), nullable=False)  # painting, renovation, general
    body_html: Mapped[str] = mapped_column(Text, nullable=False)  # 契約書本文テンプレート（Jinja2）
    appendix_html: Mapped[str | None] = mapped_column(Text)  # 別紙テンプレート
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PaintingSchedule(Base):
    """塗装工事の工程（自動生成+カスタマイズ可能）"""
    __tablename__ = "painting_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # 足場設置, 高圧洗浄, 下地処理, 養生, 下塗り, 中塗り, 上塗り, コーキング, 付帯部塗装, 足場解体, 清掃・引渡
    planned_start: Mapped[date | None] = mapped_column(Date)
    planned_end: Mapped[date | None] = mapped_column(Date)
    actual_start: Mapped[date | None] = mapped_column(Date)
    actual_end: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, in_progress, completed, skipped
    photo_ids: Mapped[dict | None] = mapped_column(JSON)  # この工程の写真
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
