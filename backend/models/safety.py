"""Safety management models (KY, patrols, incidents, trainings, orientations)."""

import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class KYActivity(Base):
    __tablename__ = "ky_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    work_content: Mapped[str | None] = mapped_column(Text)
    hazards: Mapped[dict | None] = mapped_column(JSON)  # [{hazard, measure}]
    participants: Mapped[dict | None] = mapped_column(JSON)  # [{name, worker_id}]
    leader_name: Mapped[str | None] = mapped_column(String(255))
    created_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SafetyPatrol(Base):
    __tablename__ = "safety_patrols"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    patrol_date: Mapped[date] = mapped_column(Date, nullable=False)
    inspector_name: Mapped[str | None] = mapped_column(String(255))
    checklist: Mapped[dict | None] = mapped_column(JSON)  # [{item, result, comment}]
    overall_evaluation: Mapped[str | None] = mapped_column(String(20))
    corrective_actions: Mapped[str | None] = mapped_column(Text)
    photo_ids: Mapped[dict | None] = mapped_column(JSON)
    created_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    incident_date: Mapped[date] = mapped_column(Date, nullable=False)
    incident_type: Mapped[str] = mapped_column(String(50), nullable=False)  # accident, near_miss, unsafe_condition
    severity: Mapped[str] = mapped_column(String(20), default="minor")
    location: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    cause_analysis: Mapped[str | None] = mapped_column(Text)
    corrective_action: Mapped[str | None] = mapped_column(Text)
    reporter_id: Mapped[str | None] = mapped_column(String(36))
    status: Mapped[str] = mapped_column(String(50), default="reported")
    photo_ids: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SafetyTraining(Base):
    __tablename__ = "safety_trainings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    training_date: Mapped[date] = mapped_column(Date, nullable=False)
    training_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    instructor_name: Mapped[str | None] = mapped_column(String(255))
    attendees: Mapped[dict | None] = mapped_column(JSON)  # [{worker_id, name, signed}]
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    attachment_keys: Mapped[dict | None] = mapped_column(JSON)
    created_by: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WorkerOrientation(Base):
    """新規入場者教育 (New worker orientation / safety induction)."""
    __tablename__ = "worker_orientations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    worker_id: Mapped[str] = mapped_column(String(36), nullable=False)
    orientation_date: Mapped[date] = mapped_column(Date, nullable=False)
    instructor_name: Mapped[str | None] = mapped_column(String(255))
    topics_covered: Mapped[dict | None] = mapped_column(JSON)  # list of topic strings
    health_check_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    insurance_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    safety_pledge_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    blood_type_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    emergency_contact_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    tenant_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
