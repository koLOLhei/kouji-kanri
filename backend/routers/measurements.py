"""Measurement (出来形測定) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.measurement import Measurement
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/measurements", tags=["measurements"])


# ---------- Schemas ----------

class MeasurementCreate(BaseModel):
    title: str
    measurement_type: str  # dimension / level / rebar_spacing / concrete_cover
    location: str | None = None
    measured_date: date | None = None
    items: list | None = None  # [{name, design_value, actual_value, tolerance, unit, result}]
    overall_result: str | None = None  # pass / fail
    measured_by: str | None = None
    photo_ids: list | None = None
    notes: str | None = None


class MeasurementUpdate(BaseModel):
    title: str | None = None
    measurement_type: str | None = None
    location: str | None = None
    measured_date: date | None = None
    items: list | None = None
    overall_result: str | None = None
    measured_by: str | None = None
    photo_ids: list | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_measurements(
    project_id: str,
    measurement_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Measurement).filter(Measurement.project_id == project_id)
    if measurement_type:
        q = q.filter(Measurement.measurement_type == measurement_type)
    return q.order_by(Measurement.measured_date.desc()).all()


@router.post("")
def create_measurement(
    project_id: str,
    req: MeasurementCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = req.model_dump()
    if data.get("measured_date") is None:
        from datetime import date as d
        data["measured_date"] = d.today()
    measurement = Measurement(
        project_id=project_id,
        **data,
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("/stats")
def measurement_stats(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Summary of pass/fail counts."""
    q = db.query(Measurement).filter(Measurement.project_id == project_id)
    total = q.count()
    pass_count = q.filter(Measurement.overall_result == "pass").count()
    fail_count = q.filter(Measurement.overall_result == "fail").count()
    pending = total - pass_count - fail_count
    return {
        "total": total,
        "pass": pass_count,
        "fail": fail_count,
        "pending": pending,
    }


@router.get("/{measurement_id}")
def get_measurement(
    project_id: str,
    measurement_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    measurement = db.query(Measurement).filter(
        Measurement.id == measurement_id, Measurement.project_id == project_id
    ).first()
    if not measurement:
        raise HTTPException(status_code=404, detail="測定記録が見つかりません")
    return measurement


@router.put("/{measurement_id}")
def update_measurement(
    project_id: str,
    measurement_id: str,
    req: MeasurementUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    measurement = db.query(Measurement).filter(
        Measurement.id == measurement_id, Measurement.project_id == project_id
    ).first()
    if not measurement:
        raise HTTPException(status_code=404, detail="測定記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(measurement, k, v)
    db.commit()
    db.refresh(measurement)
    return measurement
