"""施設インフラDB — 建物の「何がどこにあるか」を蓄積し、保守契約で提供する戦略資産

設計思想:
- 工事・点検のたびに施設データが自動蓄積される
- 建物全体のインフラマップが徐々に完成していく
- このデータは保守契約を結んだ顧客に格安提供 → 次の工事も受注しやすくなる
- データの蓄積量が競争優位になる（他社にはこのデータがない）
"""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, Float, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Facility(Base):
    """施設（建物）マスタ — 1つの建物に複数の工事が紐づく"""
    __tablename__ = "facilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)  # 渋谷区立中央図書館
    address: Mapped[str | None] = mapped_column(Text)
    building_type: Mapped[str | None] = mapped_column(String(100))  # office, school, hospital, housing, factory, etc.
    structure_type: Mapped[str | None] = mapped_column(String(50))  # rc, src, s, w, cb
    floors_above: Mapped[int | None] = mapped_column(Integer)  # 地上階数
    floors_below: Mapped[int | None] = mapped_column(Integer)  # 地下階数
    total_floor_area: Mapped[float | None] = mapped_column(Float)  # 延床面積 m2
    built_year: Mapped[int | None] = mapped_column(Integer)  # 竣工年
    owner_name: Mapped[str | None] = mapped_column(String(255))  # 建物所有者
    owner_contact: Mapped[str | None] = mapped_column(String(255))
    gps_lat: Mapped[float | None] = mapped_column(Float)
    gps_lng: Mapped[float | None] = mapped_column(Float)
    # 保守契約
    maintenance_contract: Mapped[bool] = mapped_column(Boolean, default=False)
    contract_start: Mapped[date | None] = mapped_column(Date)
    contract_end: Mapped[date | None] = mapped_column(Date)
    contract_amount_yearly: Mapped[int | None] = mapped_column(Integer)  # 年間保守料
    # データ共有設定
    data_access_level: Mapped[str] = mapped_column(String(20), default="private")  # private, contract_only, public
    # メタ
    notes: Mapped[str | None] = mapped_column(Text)
    photo_key: Mapped[str | None] = mapped_column(String(500))  # 外観写真
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FacilityZone(Base):
    """施設内のゾーン（フロア・エリア・部屋）"""
    __tablename__ = "facility_zones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    facility_id: Mapped[str] = mapped_column(String(36), nullable=False)
    parent_zone_id: Mapped[str | None] = mapped_column(String(36))  # 階層構造: 建物→フロア→部屋
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # "1F", "EV機械室", "電気室", "屋上"
    zone_type: Mapped[str] = mapped_column(String(50), nullable=False)  # floor, room, area, shaft, ceiling_void, underground
    floor_number: Mapped[int | None] = mapped_column(Integer)
    area_m2: Mapped[float | None] = mapped_column(Float)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InfraElement(Base):
    """インフラ要素 — 電線、配管、設備など「建物の中に何があるか」

    工事や点検のたびにここにデータが蓄積される。
    これが戦略資産になる。
    """
    __tablename__ = "infra_elements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    facility_id: Mapped[str] = mapped_column(String(36), nullable=False)
    zone_id: Mapped[str | None] = mapped_column(String(36))  # どのゾーンにあるか
    # 分類
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    # electrical(電気), plumbing(給排水), hvac(空調), fire(消防), gas(ガス),
    # structural(構造), communication(通信), security(セキュリティ), other
    element_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # 電気: cable(ケーブル), conduit(配管), panel(分電盤), outlet(コンセント), switch, breaker, transformer
    # 配管: water_pipe, drain_pipe, gas_pipe, valve, pump, tank
    # 空調: duct, air_handler, chiller, fan, damper
    # 消防: sprinkler, detector, alarm, extinguisher, hydrant
    name: Mapped[str] = mapped_column(String(500), nullable=False)  # "VVF2.0-3C", "VP100A", "分電盤P-1A"
    # 位置
    position_description: Mapped[str | None] = mapped_column(Text)  # "天井裏、梁貫通スリーブ経由"
    position_x: Mapped[float | None] = mapped_column(Float)  # 図面上のX座標
    position_y: Mapped[float | None] = mapped_column(Float)  # 図面上のY座標
    route_description: Mapped[str | None] = mapped_column(Text)  # 配線・配管のルート説明
    # スペック
    specification: Mapped[str | None] = mapped_column(String(500))  # 仕様 "VVF2.0mm×3芯"
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    model_number: Mapped[str | None] = mapped_column(String(255))
    installation_date: Mapped[date | None] = mapped_column(Date)
    expected_lifetime_years: Mapped[int | None] = mapped_column(Integer)  # 耐用年数
    # 状態
    condition: Mapped[str] = mapped_column(String(20), default="good")  # good, fair, poor, critical, unknown
    last_inspected: Mapped[date | None] = mapped_column(Date)
    next_inspection_due: Mapped[date | None] = mapped_column(Date)
    # 関連
    related_drawing_id: Mapped[str | None] = mapped_column(String(36))
    photo_ids: Mapped[dict | None] = mapped_column(JSON)
    attributes: Mapped[dict | None] = mapped_column(JSON)  # 追加属性 {"voltage": "200V", "capacity": "30A"}
    # 発見情報
    discovered_project_id: Mapped[str | None] = mapped_column(String(36))  # どの工事で発見/記録されたか
    discovered_by: Mapped[str | None] = mapped_column(String(255))
    discovered_date: Mapped[date | None] = mapped_column(Date)
    # メタ
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InfraInspectionLog(Base):
    """インフラ要素の点検・工事履歴 — 時系列でデータが蓄積"""
    __tablename__ = "infra_inspection_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    element_id: Mapped[str] = mapped_column(String(36), nullable=False)
    facility_id: Mapped[str] = mapped_column(String(36), nullable=False)
    log_type: Mapped[str] = mapped_column(String(50), nullable=False)  # inspection(点検), repair(修理), replacement(交換), discovery(発見), upgrade(更新)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    project_id: Mapped[str | None] = mapped_column(String(36))  # 関連工事
    description: Mapped[str | None] = mapped_column(Text)
    condition_before: Mapped[str | None] = mapped_column(String(20))  # 作業前状態
    condition_after: Mapped[str | None] = mapped_column(String(20))  # 作業後状態
    cost: Mapped[int | None] = mapped_column(Integer)
    photo_ids: Mapped[dict | None] = mapped_column(JSON)
    performed_by: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MaintenanceContract(Base):
    """保守契約管理 — データ提供の対価"""
    __tablename__ = "maintenance_contracts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    facility_id: Mapped[str] = mapped_column(String(36), nullable=False)
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)  # 契約先
    client_contact: Mapped[str | None] = mapped_column(String(255))
    contract_type: Mapped[str] = mapped_column(String(50), nullable=False)  # full(フル保守), partial(部分), data_only(データ提供のみ)
    contract_start: Mapped[date] = mapped_column(Date, nullable=False)
    contract_end: Mapped[date | None] = mapped_column(Date)
    annual_fee: Mapped[int | None] = mapped_column(Integer)  # 年間保守料
    data_access_scope: Mapped[str] = mapped_column(String(50), default="basic")  # basic(基本), full(全データ), custom
    # データ提供範囲の詳細
    accessible_categories: Mapped[dict | None] = mapped_column(JSON)  # ["electrical", "plumbing"] 等
    includes_drawings: Mapped[bool] = mapped_column(Boolean, default=False)
    includes_photos: Mapped[bool] = mapped_column(Boolean, default=False)
    includes_inspection_history: Mapped[bool] = mapped_column(Boolean, default=True)
    # 状態
    status: Mapped[str] = mapped_column(String(30), default="active")  # draft, active, expired, cancelled
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
