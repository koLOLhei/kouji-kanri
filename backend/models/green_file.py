"""Green file (グリーンファイル) model.

グリーンファイルは建設業において元請会社が下請業者から収集・管理する
安全衛生・施工体制に関する書類群の総称です。
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base

# 書類種別
FILE_TYPES = {
    "worker_roster": "作業員名簿",
    "safety_education": "安全衛生教育実施報告書",
    "construction_org": "施工体制台帳",
    "equipment_list": "持込機械等使用届",
    "hazardous_work": "有機溶剤・特定化学物質等持込使用届",
    "fire_work": "火気使用届",
    "health_insurance": "社会保険加入状況確認書",
    "subcontractor_chain": "再下請負通知書",
    "accident_prevention": "災害防止協議会参加確認書",
}

STATUS_PENDING = "pending"
STATUS_SUBMITTED = "submitted"
STATUS_APPROVED = "approved"
STATUS_REJECTED = "rejected"


class GreenFile(Base):
    """グリーンファイル書類管理モデル"""
    __tablename__ = "green_files"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    # 書類の種別 (see FILE_TYPES above)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # 書類タイトル（自由記述 or 自動設定）
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    # 関連する下請業者 ID（任意）
    subcontractor_id: Mapped[str | None] = mapped_column(String(36))
    # ステータス: pending / submitted / approved / rejected
    status: Mapped[str] = mapped_column(String(50), default=STATUS_PENDING)
    # アップロード済みファイルのストレージキー
    file_key: Mapped[str | None] = mapped_column(String(1000))
    # 担当者・提出者メモ
    notes: Mapped[str | None] = mapped_column(Text)
    # 期限
    due_date: Mapped[datetime | None] = mapped_column(DateTime)
    # 書類を提出したユーザー
    submitted_by: Mapped[str | None] = mapped_column(String(36))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    # 承認者
    approved_by: Mapped[str | None] = mapped_column(String(36))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    # 却下理由
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
