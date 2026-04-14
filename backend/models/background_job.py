"""バックグラウンドジョブの状態管理モデル"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "zip_generation"
    project_id: Mapped[str] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="processing")  # processing, completed, failed
    result_key: Mapped[str | None] = mapped_column(String(500), nullable=True)  # S3/local storage key
    result_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
