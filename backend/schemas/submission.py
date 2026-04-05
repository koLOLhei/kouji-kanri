"""Submission schemas."""

from datetime import datetime
from pydantic import BaseModel


class SubmissionResponse(BaseModel):
    id: str
    project_id: str
    phase_id: str | None
    submission_type: str
    title: str
    file_key: str | None
    status: str
    generated_at: datetime | None
    submitted_at: datetime | None
    checksum: str | None = None
    current_version: int = 1
    created_at: datetime
    download_url: str | None = None

    class Config:
        from_attributes = True


class GenerateRequest(BaseModel):
    phase_id: str
    submission_type: str = "process_completion"
    change_description: str | None = None  # used for document versioning
