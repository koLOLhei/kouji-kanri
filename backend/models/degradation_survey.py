"""マンション大規模修繕 劣化診断（現地調査）— kamo-hp 社内ツール連携用。

タイル/外壁/シーリング/防水/鉄部の構造化診断データと現場写真を保持。
構造化データ・写真は可搬性と柔軟性のため JSON 列に格納する。
テナント単位で共有（同一テナントのユーザーは互いの診断を閲覧・編集可能）。
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class DegradationSurvey(Base):
    """劣化診断 現地調査記録（kamo 社内ツール）"""
    __tablename__ = "degradation_surveys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_by: Mapped[str | None] = mapped_column(String(36))
    # 一覧・検索用メタ（JSON内の値を列として複製）
    property_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    address: Mapped[str | None] = mapped_column(Text)
    overall_grade: Mapped[str | None] = mapped_column(String(1))  # a / b / c / d
    inspector_name: Mapped[str | None] = mapped_column(String(255))
    survey_date: Mapped[str | None] = mapped_column(String(20))  # ISO 'YYYY-MM-DD'（kamo側入力をそのまま）
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft / completed
    # 構造化診断データ（kamo現調シートの section -> field -> value）
    data: Mapped[dict | None] = mapped_column(JSON)
    # 現場写真 [{id, sectionKey, caption, dataUrl}]（圧縮済みJPEGのdataURL）
    photos: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
