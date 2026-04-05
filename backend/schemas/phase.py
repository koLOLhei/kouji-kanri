"""Phase schemas."""

from datetime import date, datetime
from pydantic import BaseModel


class PhaseCreate(BaseModel):
    name: str
    spec_chapter_id: str | None = None
    phase_code: str | None = None
    parent_phase_id: str | None = None
    sort_order: int = 0
    planned_start: date | None = None
    planned_end: date | None = None
    notes: str | None = None


class PhaseUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    actual_start: date | None = None
    actual_end: date | None = None
    notes: str | None = None


class PhaseResponse(BaseModel):
    id: str
    project_id: str
    spec_chapter_id: str | None
    name: str
    phase_code: str | None
    parent_phase_id: str | None
    sort_order: int
    status: str
    planned_start: date | None
    planned_end: date | None
    actual_start: date | None
    actual_end: date | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    children: list["PhaseResponse"] | None = None
    requirements_met: int | None = None
    requirements_total: int | None = None

    class Config:
        from_attributes = True


class RequirementCreate(BaseModel):
    requirement_type: str  # photo, report, test_result, approval
    name: str
    description: str | None = None
    min_count: int = 1
    is_mandatory: bool = True
    sort_order: int = 0


class RequirementResponse(BaseModel):
    id: str
    phase_id: str
    requirement_type: str
    name: str
    description: str | None
    min_count: int
    is_mandatory: bool
    sort_order: int
    fulfilled_count: int | None = None

    class Config:
        from_attributes = True
