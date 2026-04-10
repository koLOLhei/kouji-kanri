"""CRM + 顧客管理 + リード管理 + エンティティリンク

設計思想:
- 全てのデータ（人、会社、施設、案件）は「ノード」
- ノード同士が「リンク」で繋がる
- どこからでもリンクを辿って関連情報に到達できる
- 蓄積されるほど価値が上がるナレッジグラフ
"""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, BigInteger, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


# ─── ブランド/事業部（M&A・複数看板対応）───

class Brand(Base):
    """事業ブランド/看板 — M&Aや新規事業で増える"""
    __tablename__ = "brands"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # "○○建設", "△△電気工事"
    trade_type: Mapped[str | None] = mapped_column(String(100))  # 建築, 電気, 管工事, 塗装, etc.
    license_number: Mapped[str | None] = mapped_column(String(100))  # 建設業許可番号
    representative: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    acquired_date: Mapped[date | None] = mapped_column(Date)  # M&A取得日
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── 顧客管理 ───

class Customer(Base):
    """顧客（法人）— 発注者、管理会社、施設オーナー等"""
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_type: Mapped[str | None] = mapped_column(String(50))  # government(官公庁), private(民間), management(管理会社), developer(デベロッパー)
    industry: Mapped[str | None] = mapped_column(String(100))  # 不動産, 医療, 教育, 商業, etc.
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(500))
    # 取引状況
    status: Mapped[str] = mapped_column(String(30), default="prospect")  # prospect, active, dormant, lost
    first_contact_date: Mapped[date | None] = mapped_column(Date)
    total_contract_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # 累計受注額
    project_count: Mapped[int] = mapped_column(Integer, default=0)  # 累計案件数
    # ランク
    rank: Mapped[str | None] = mapped_column(String(10))  # S, A, B, C, D
    assigned_brand_id: Mapped[str | None] = mapped_column(String(36))  # 担当ブランド
    assigned_sales_id: Mapped[str | None] = mapped_column(String(36))  # 担当営業
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CustomerContact(Base):
    """顧客の担当者（個人）"""
    __tablename__ = "customer_contacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(255))  # 施設管理課, 総務部
    position: Mapped[str | None] = mapped_column(String(100))  # 課長, 部長, 担当
    phone: Mapped[str | None] = mapped_column(String(50))
    mobile: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)  # 主担当
    is_decision_maker: Mapped[bool] = mapped_column(Boolean, default=False)  # 決裁者
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── リード管理 ───

class Lead(Base):
    """リード — 誰がどうやって獲得したか"""
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # referral(紹介), web, phone, event, cold_call, existing_client, public_bid(公共入札)
    source_detail: Mapped[str | None] = mapped_column(String(255))  # 紹介元の名前、イベント名等
    acquired_by: Mapped[str | None] = mapped_column(String(36))  # 獲得した営業担当のuser_id
    acquired_by_name: Mapped[str | None] = mapped_column(String(255))
    acquired_date: Mapped[date] = mapped_column(Date, nullable=False)
    # リード情報
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)  # 要望内容
    estimated_amount: Mapped[int | None] = mapped_column(BigInteger)
    # 状態
    status: Mapped[str] = mapped_column(String(30), default="new")  # new, contacted, qualified, proposal, negotiation, won, lost
    priority: Mapped[str] = mapped_column(String(10), default="B")  # A, B, C
    lost_reason: Mapped[str | None] = mapped_column(Text)
    # 変換
    converted_customer_id: Mapped[str | None] = mapped_column(String(36))
    converted_project_id: Mapped[str | None] = mapped_column(String(36))
    converted_date: Mapped[date | None] = mapped_column(Date)
    brand_id: Mapped[str | None] = mapped_column(String(36))  # どのブランドで対応
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── やりとり履歴（全てのタッチポイント）───

class Interaction(Base):
    """やりとりログ — 電話、メール、打合せ、現場訪問、全て記録"""
    __tablename__ = "interactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # 誰と
    customer_id: Mapped[str | None] = mapped_column(String(36))
    contact_id: Mapped[str | None] = mapped_column(String(36))
    lead_id: Mapped[str | None] = mapped_column(String(36))
    project_id: Mapped[str | None] = mapped_column(String(36))
    # いつ・何を
    interaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    interaction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # call, email, meeting, site_visit, proposal, presentation, other
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str | None] = mapped_column(Text)  # 結果・次のアクション
    # 誰が
    performed_by: Mapped[str | None] = mapped_column(String(36))
    performed_by_name: Mapped[str | None] = mapped_column(String(255))
    # 次のアクション
    next_action: Mapped[str | None] = mapped_column(String(500))
    next_action_date: Mapped[date | None] = mapped_column(Date)
    # 添付
    attachment_keys: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── エンティティリンク（全てを繋ぐ）───

class EntityLink(Base):
    """エンティティ間のリンク — どんなデータ同士も繋げられる万能リンク

    例:
    - customer ←→ project (この顧客がこの案件を発注)
    - customer ←→ facility (この顧客がこの施設を所有)
    - project ←→ subcontractor (この案件でこの下請を使った)
    - project ←→ material (この案件でこの材料を使った)
    - contact ←→ project (この担当者がこの案件の窓口)
    - brand ←→ project (このブランドで受注)
    """
    __tablename__ = "entity_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # From
    from_type: Mapped[str] = mapped_column(String(50), nullable=False)  # customer, contact, project, facility, subcontractor, brand, lead, worker
    from_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # To
    to_type: Mapped[str] = mapped_column(String(50), nullable=False)
    to_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # 関係
    relationship: Mapped[str] = mapped_column(String(100), nullable=False)  # ordered(発注), owns(所有), worked_on(施工), supplied(納品), managed_by(管理), introduced_by(紹介)
    description: Mapped[str | None] = mapped_column(String(500))
    metadata_json: Mapped[dict | None] = mapped_column(JSON)  # 追加情報 {"contract_amount": 5000000, "materials_used": ["VVF2.0"]}
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
