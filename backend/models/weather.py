"""Weather record model."""

import uuid
from datetime import datetime, date

from sqlalchemy import String, Float, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    weather_06: Mapped[str | None] = mapped_column(String(20))
    weather_09: Mapped[str | None] = mapped_column(String(20))
    weather_12: Mapped[str | None] = mapped_column(String(20))
    weather_15: Mapped[str | None] = mapped_column(String(20))
    temp_max: Mapped[float | None] = mapped_column(Float)
    temp_min: Mapped[float | None] = mapped_column(Float)
    humidity: Mapped[float | None] = mapped_column(Float)
    wind_speed: Mapped[float | None] = mapped_column(Float)
    wind_direction: Mapped[str | None] = mapped_column(String(20))
    rainfall_mm: Mapped[float | None] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(50), default="manual")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
