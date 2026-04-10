"""コンクリート養生管理 — 打設日から養生日数を自動追跡、脱型可能日アラート"""

import uuid
from datetime import datetime, timezone, date, timedelta

from sqlalchemy import String, Integer, Float, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ConcretePlacement(Base):
    """コンクリート打設記録 + 養生管理"""
    __tablename__ = "concrete_placements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    phase_id: Mapped[str | None] = mapped_column(String(36))
    # 打設情報
    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)  # 打設箇所: 1F柱, 2F床版 etc.
    member_type: Mapped[str] = mapped_column(String(50), nullable=False)  # column, beam, slab, wall, foundation
    volume_m3: Mapped[float | None] = mapped_column(Float)  # 打設量 m3
    # コンクリート仕様
    design_strength: Mapped[str | None] = mapped_column(String(50))  # 設計基準強度 Fc (e.g. "24N/mm2")
    mix_code: Mapped[str | None] = mapped_column(String(100))  # 配合コード
    slump: Mapped[float | None] = mapped_column(Float)  # スランプ cm
    air_content: Mapped[float | None] = mapped_column(Float)  # 空気量 %
    chloride: Mapped[float | None] = mapped_column(Float)  # 塩化物量 kg/m3
    concrete_temp: Mapped[float | None] = mapped_column(Float)  # コンクリート温度 ℃
    ambient_temp: Mapped[float | None] = mapped_column(Float)  # 外気温 ℃
    # 養生管理
    curing_method: Mapped[str | None] = mapped_column(String(100))  # 散水, シート, 膜養生, 蒸気養生
    curing_start: Mapped[date | None] = mapped_column(Date)
    curing_days_required: Mapped[int] = mapped_column(Integer, default=5)  # 標準: 普通セメント5日, 早強3日
    curing_end_target: Mapped[date | None] = mapped_column(Date)  # 自動計算: placement_date + curing_days
    curing_actual_end: Mapped[date | None] = mapped_column(Date)  # 実際の養生終了日
    curing_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    # 型枠管理
    formwork_removal_days: Mapped[int] = mapped_column(Integer, default=28)  # 型枠存置期間
    formwork_removal_target: Mapped[date | None] = mapped_column(Date)  # 脱型可能日
    formwork_removed: Mapped[bool] = mapped_column(Boolean, default=False)
    formwork_removed_date: Mapped[date | None] = mapped_column(Date)
    # 強度試験
    test_7day_strength: Mapped[float | None] = mapped_column(Float)  # 7日強度 N/mm2
    test_28day_strength: Mapped[float | None] = mapped_column(Float)  # 28日強度 N/mm2
    test_7day_date: Mapped[date | None] = mapped_column(Date)
    test_28day_date: Mapped[date | None] = mapped_column(Date)
    strength_passed: Mapped[bool | None] = mapped_column(Boolean)
    # 供試体
    specimen_count: Mapped[int | None] = mapped_column(Integer)
    specimen_ids: Mapped[dict | None] = mapped_column(JSON)  # 供試体番号リスト
    # メタ
    weather: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    photo_ids: Mapped[dict | None] = mapped_column(JSON)
    recorded_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ToleranceStandard(Base):
    """工種別許容差マスタ — 仕様書基準値を保持"""
    __tablename__ = "tolerance_standards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    spec_code: Mapped[str] = mapped_column(String(100), default="kokyo_r7")
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # rebar, concrete, formwork, steel, masonry
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)  # 配筋間隔, かぶり厚さ, スランプ etc.
    design_unit: Mapped[str] = mapped_column(String(50), nullable=False)  # mm, cm, N/mm2, %
    tolerance_plus: Mapped[float | None] = mapped_column(Float)  # 上限許容差
    tolerance_minus: Mapped[float | None] = mapped_column(Float)  # 下限許容差
    reference_section: Mapped[str | None] = mapped_column(String(100))  # 仕様書の参照節 (e.g. "5.3.4")
    notes: Mapped[str | None] = mapped_column(Text)
