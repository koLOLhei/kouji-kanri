"""Project-level access control — プロジェクト単位のメンバー管理"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ProjectMember(Base):
    """プロジェクトメンバー — manager/member/viewer の3ロール"""
    __tablename__ = "project_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="member")  # manager, member, viewer
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
