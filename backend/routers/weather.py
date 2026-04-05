"""Weather record (気象記録) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.weather import WeatherRecord
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/weather", tags=["weather"])


# ---------- Schemas ----------

class WeatherCreate(BaseModel):
    record_date: date
    weather_06: str | None = None
    weather_09: str | None = None
    weather_12: str | None = None
    weather_15: str | None = None
    temp_max: float | None = None
    temp_min: float | None = None
    humidity: float | None = None
    wind_speed: float | None = None
    wind_direction: str | None = None
    rainfall_mm: float | None = None
    source: str = "manual"
    notes: str | None = None


class WeatherUpdate(BaseModel):
    weather_06: str | None = None
    weather_09: str | None = None
    weather_12: str | None = None
    weather_15: str | None = None
    temp_max: float | None = None
    temp_min: float | None = None
    humidity: float | None = None
    wind_speed: float | None = None
    wind_direction: str | None = None
    rainfall_mm: float | None = None
    source: str | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_weather(
    project_id: str,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(WeatherRecord).filter(WeatherRecord.project_id == project_id)
    if date_from:
        q = q.filter(WeatherRecord.record_date >= date_from)
    if date_to:
        q = q.filter(WeatherRecord.record_date <= date_to)
    return q.order_by(WeatherRecord.record_date.desc()).all()


@router.post("")
def create_weather(
    project_id: str,
    req: WeatherCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = WeatherRecord(project_id=project_id, **req.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/by-date/{record_date}")
def get_weather_by_date(
    project_id: str,
    record_date: date,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(WeatherRecord).filter(
        WeatherRecord.project_id == project_id,
        WeatherRecord.record_date == record_date,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="気象記録が見つかりません")
    return record


@router.get("/{record_id}")
def get_weather(
    project_id: str,
    record_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(WeatherRecord).filter(
        WeatherRecord.id == record_id, WeatherRecord.project_id == project_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="気象記録が見つかりません")
    return record


@router.put("/{record_id}")
def update_weather(
    project_id: str,
    record_id: str,
    req: WeatherUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(WeatherRecord).filter(
        WeatherRecord.id == record_id, WeatherRecord.project_id == project_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="気象記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}")
def delete_weather(
    project_id: str,
    record_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(WeatherRecord).filter(
        WeatherRecord.id == record_id, WeatherRecord.project_id == project_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="気象記録が見つかりません")
    db.delete(record)
    db.commit()
    return {"status": "ok"}
