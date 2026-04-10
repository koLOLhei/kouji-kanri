"""下請指示書・連絡書 + 特記仕様書管理 + 受注確度管理"""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, BigInteger, Float, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class SubcontractorInstruction(Base):
    """下請への指示書・連絡書"""
    __tablename__ = "subcontractor_instructions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    instruction_number: Mapped[str | None] = mapped_column(String(50))
    instruction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # instruction(指示), notice(連絡), request(依頼), warning(注意)
    to_company_id: Mapped[str | None] = mapped_column(String(36))  # 宛先(Subcontractor ID)
    to_company_name: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    deadline: Mapped[date | None] = mapped_column(Date)
    response_required: Mapped[bool] = mapped_column(default=False)
    response_received: Mapped[bool] = mapped_column(default=False)
    response_content: Mapped[str | None] = mapped_column(Text)
    issued_by: Mapped[str | None] = mapped_column(String(36))
    issued_date: Mapped[date | None] = mapped_column(Date)
    attachment_keys: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SpecialSpecification(Base):
    """特記仕様書管理"""
    __tablename__ = "special_specifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    chapter_ref: Mapped[str | None] = mapped_column(String(100))  # 対応する標準仕様書の章
    content_summary: Mapped[str | None] = mapped_column(Text)  # 要約
    file_key: Mapped[str | None] = mapped_column(String(500))
    priority: Mapped[int] = mapped_column(Integer, default=3)  # 1=質問回答書,2=現場説明書,3=特記仕様書,4=図面,5=標準仕様書
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FinishSample(Base):
    """色見本・仕上げ見本管理"""
    __tablename__ = "finish_samples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    sample_type: Mapped[str] = mapped_column(String(50), nullable=False)  # color(色見本), texture(仕上見本), material(材料見本)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))  # 使用場所
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    product_code: Mapped[str | None] = mapped_column(String(100))
    color_code: Mapped[str | None] = mapped_column(String(50))  # マンセル値等
    file_key: Mapped[str | None] = mapped_column(String(500))  # 写真
    status: Mapped[str] = mapped_column(String(50), default="proposed")  # proposed, approved, rejected
    approved_by: Mapped[str | None] = mapped_column(String(255))
    approved_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CompletionDrawing(Base):
    """完成図（竣工図）管理"""
    __tablename__ = "completion_drawings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    drawing_number: Mapped[str | None] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # architectural, structural, mechanical, electrical
    original_drawing_id: Mapped[str | None] = mapped_column(String(36))  # 元の施工図
    file_key: Mapped[str | None] = mapped_column(String(500))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, review, approved
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SalesPipeline(Base):
    """受注確度管理（営業パイプライン）"""
    __tablename__ = "sales_pipeline"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_name: Mapped[str] = mapped_column(String(500), nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(255))
    estimated_amount: Mapped[int | None] = mapped_column(BigInteger)
    probability: Mapped[str] = mapped_column(String(10), nullable=False)  # A(80%+), B(50-79%), C(<50%)
    stage: Mapped[str] = mapped_column(String(50), default="prospect")  # prospect, bidding, negotiation, awarded, lost
    expected_start: Mapped[date | None] = mapped_column(Date)
    bid_deadline: Mapped[date | None] = mapped_column(Date)
    assigned_to: Mapped[str | None] = mapped_column(String(36))
    source: Mapped[str | None] = mapped_column(String(100))  # 情報入手元
    notes: Mapped[str | None] = mapped_column(Text)
    converted_project_id: Mapped[str | None] = mapped_column(String(36))  # 受注後のProject ID
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VEProposal(Base):
    """VE提案・技術提案管理"""
    __tablename__ = "ve_proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    proposal_number: Mapped[str | None] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    proposal_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ve(VE提案), technical(技術提案), improvement(改善提案)
    description: Mapped[str | None] = mapped_column(Text)
    expected_benefit: Mapped[str | None] = mapped_column(Text)  # 期待効果
    cost_reduction: Mapped[int | None] = mapped_column(BigInteger)  # コスト削減額
    schedule_impact_days: Mapped[int | None] = mapped_column(Integer)  # 工期影響日数
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, submitted, approved, rejected, implemented
    submitted_date: Mapped[date | None] = mapped_column(Date)
    approved_date: Mapped[date | None] = mapped_column(Date)
    implementation_status: Mapped[str | None] = mapped_column(Text)
    netis_number: Mapped[str | None] = mapped_column(String(50))  # NETIS登録番号
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PhotoGuide(Base):
    """撮影ガイド（見本写真）"""
    __tablename__ = "photo_guides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    spec_code: Mapped[str] = mapped_column(String(100), default="kokyo_r7")
    work_type: Mapped[str] = mapped_column(String(100), nullable=False)  # 工種
    photo_category: Mapped[str] = mapped_column(String(50), nullable=False)  # 写真区分
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)  # 撮影の注意点
    angle_guide: Mapped[str | None] = mapped_column(Text)  # 撮影角度の指示
    required_elements: Mapped[dict | None] = mapped_column(JSON)  # 写真に含めるべき要素
    example_file_key: Mapped[str | None] = mapped_column(String(500))  # 見本写真
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class DrawingPhaseMapping(Base):
    """図面と工程の連動マッピング"""
    __tablename__ = "drawing_phase_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    drawing_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str] = mapped_column(String(36), nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UsageTelemetry(Base):
    """利用データ分析（テレメトリ）"""
    __tablename__ = "usage_telemetry"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # page_view, feature_use, photo_upload, report_submit, etc.
    event_data: Mapped[dict | None] = mapped_column(JSON)
    page_path: Mapped[str | None] = mapped_column(String(500))
    device_type: Mapped[str | None] = mapped_column(String(20))  # mobile, desktop, tablet
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
