"""Project schemas."""

from datetime import date, datetime
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    project_code: str | None = None
    client_name: str | None = None
    contractor_name: str | None = None
    site_address: str | None = None
    contract_amount: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    spec_base: str = "kokyo_r7"
    regional_spec: str | None = None
    manager_id: str | None = None
    notes: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    project_code: str | None = None
    client_name: str | None = None
    contractor_name: str | None = None
    site_address: str | None = None
    contract_amount: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    regional_spec: str | None = None
    manager_id: str | None = None
    notes: str | None = None


class ProjectResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    project_code: str | None
    client_name: str | None
    contractor_name: str | None
    site_address: str | None
    contract_amount: int | None
    start_date: date | None
    end_date: date | None
    status: str
    spec_base: str
    regional_spec: str | None
    manager_id: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    phase_count: int | None = None
    completed_phases: int | None = None

    class Config:
        from_attributes = True
