"""打合せ記録 (Meeting Minutes) model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False)
    meeting_type: Mapped[str] = mapped_column(String(50), nullable=False)  # regular, safety, client, internal, inspection
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    attendees: Mapped[dict | None] = mapped_column(JSON)  # [{name, organization, role}]
    agenda: Mapped[str | None] = mapped_column(Text)  # 議題
    minutes: Mapped[str | None] = mapped_column(Text)  # 議事内容
    decisions: Mapped[dict | None] = mapped_column(JSON)  # [{item, responsible, deadline}]
    action_items: Mapped[dict | None] = mapped_column(JSON)  # [{item, assignee, due_date, status}]
    attachment_keys: Mapped[dict | None] = mapped_column(JSON)
    next_meeting_date: Mapped[date | None] = mapped_column(Date)
    created_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
