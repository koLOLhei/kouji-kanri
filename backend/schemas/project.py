"""Project schemas."""

from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    project_code: str | None = Field(None, max_length=100)
    client_name: str | None = Field(None, max_length=255)
    contractor_name: str | None = Field(None, max_length=255)
    site_address: str | None = Field(None, max_length=500)
    contract_amount: int | None = Field(None, ge=0, le=10_000_000_000)
    start_date: date | None = None
    end_date: date | None = None
    spec_base: str = Field("kokyo_r7", max_length=100)
    regional_spec: str | None = Field(None, max_length=100)
    manager_id: str | None = Field(None, max_length=36)
    notes: str | None = Field(None, max_length=10000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=500)
    project_code: str | None = Field(None, max_length=100)
    client_name: str | None = Field(None, max_length=255)
    contractor_name: str | None = Field(None, max_length=255)
    site_address: str | None = Field(None, max_length=500)
    contract_amount: int | None = Field(None, ge=0, le=10_000_000_000)
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = Field(None, max_length=50)
    regional_spec: str | None = Field(None, max_length=100)
    manager_id: str | None = Field(None, max_length=36)
    notes: str | None = Field(None, max_length=10000)


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

    model_config = ConfigDict(from_attributes=True)
