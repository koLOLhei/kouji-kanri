"""鉄骨UT検査・溶接検査記録 (施工管理技士1級指摘)"""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, Float, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class SteelWeldInspection(Base):
    """鉄骨溶接検査（超音波探傷検査UT含む）"""
    __tablename__ = "steel_weld_inspections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    inspection_date: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)  # 部位: 柱-梁接合部 etc.
    joint_type: Mapped[str] = mapped_column(String(50), nullable=False)  # complete_penetration, partial, fillet
    inspection_method: Mapped[str] = mapped_column(String(50), nullable=False)  # ut(超音波), vt(外観), rt(放射線), mt(磁粉)
    total_joints: Mapped[int] = mapped_column(Integer, nullable=False)  # 検査対象箇所数
    inspected_joints: Mapped[int] = mapped_column(Integer, nullable=False)  # 検査実施数
    passed_joints: Mapped[int] = mapped_column(Integer, nullable=False)  # 合格数
    failed_joints: Mapped[int] = mapped_column(Integer, default=0)
    inspection_rate: Mapped[float | None] = mapped_column(Float)  # 検査率 %
    pass_rate: Mapped[float | None] = mapped_column(Float)  # 合格率 %
    inspector_name: Mapped[str | None] = mapped_column(String(255))
    inspector_qualification: Mapped[str | None] = mapped_column(String(255))  # JIS Z 2305 等
    details: Mapped[dict | None] = mapped_column(JSON)  # [{joint_no, location, result, defect_type}]
    photo_ids: Mapped[dict | None] = mapped_column(JSON)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
