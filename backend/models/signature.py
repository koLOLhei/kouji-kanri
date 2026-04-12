"""Digital signature / hanko model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class DigitalSignature(Base):
    __tablename__ = "digital_signatures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "daily_report", "safety_pledge", "delivery", "inspection"
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    signer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    signer_role: Mapped[str] = mapped_column(String(50), nullable=False)  # "worker", "site_manager", "inspector", "client"
    signature_data: Mapped[str] = mapped_column(Text, nullable=False)  # Base64 encoded PNG
    signed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    device_info: Mapped[str | None] = mapped_column(String(200))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
