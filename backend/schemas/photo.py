"""Photo schemas."""

from datetime import datetime
from pydantic import BaseModel


class PhotoResponse(BaseModel):
    id: str
    project_id: str
    phase_id: str | None
    requirement_id: str | None
    file_key: str
    thumbnail_key: str | None
    original_filename: str | None
    file_size: int | None
    mime_type: str | None
    width: int | None
    height: int | None
    taken_at: datetime | None
    gps_lat: float | None
    gps_lng: float | None
    caption: str | None
    tags: list | None
    uploaded_by: str | None
    created_at: datetime
    url: str | None = None
    thumbnail_url: str | None = None
    # 電子納品 分類フィールド
    work_type: str | None = None
    work_subtype: str | None = None
    work_detail: str | None = None
    photo_category: str | None = None
    photo_number: int | None = None

    class Config:
        from_attributes = True


class PhotoUpdate(BaseModel):
    phase_id: str | None = None
    requirement_id: str | None = None
    caption: str | None = None
    tags: list | None = None
    work_type: str | None = None
    work_subtype: str | None = None
    work_detail: str | None = None
    photo_category: str | None = None
    photo_number: int | None = None
