"""Project (案件) model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, BigInteger, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)  # 工事名
    project_code: Mapped[str | None] = mapped_column(String(100))  # 工事番号
    client_name: Mapped[str | None] = mapped_column(String(255))  # 発注者
    contractor_name: Mapped[str | None] = mapped_column(String(255))  # 施工者
    site_address: Mapped[str | None] = mapped_column(Text)  # 工事場所
    contract_amount: Mapped[int | None] = mapped_column(BigInteger)  # 請負金額
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="planning")  # planning, active, inspection, completed
    spec_base: Mapped[str] = mapped_column(String(100), default="kokyo_r7")  # 適用仕様書
    regional_spec: Mapped[str | None] = mapped_column(String(100))  # 地域仕様
    manager_id: Mapped[str | None] = mapped_column(String(36))  # 現場代理人
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
