"""鉄骨溶接検査 (Steel Weld Inspection) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.steel_inspection import SteelWeldInspection
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/steel-inspections", tags=["steel-inspections"])


# ---------- Schemas ----------

class SteelInspectionCreate(BaseModel):
    inspection_date: date
    location: str
    joint_type: str
    inspection_method: str
    total_joints: int
    inspected_joints: int
    passed_joints: int
    failed_joints: int = 0
    inspector_name: str | None = None
    inspector_qualification: str | None = None
    details: dict | None = None
    photo_ids: dict | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_steel_inspections(
    project_id: str,
    inspection_method: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    q = db.query(SteelWeldInspection).filter(SteelWeldInspection.project_id == project_id)
    if inspection_method:
        q = q.filter(SteelWeldInspection.inspection_method == inspection_method)
    return q.order_by(SteelWeldInspection.inspection_date.desc()).all()


@router.post("", status_code=201)
def create_steel_inspection(
    project_id: str,
    body: SteelInspectionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    # Auto-calc inspection_rate and pass_rate
    inspection_rate = (body.inspected_joints / body.total_joints * 100) if body.total_joints > 0 else 0.0
    pass_rate = (body.passed_joints / body.inspected_joints * 100) if body.inspected_joints > 0 else 0.0

    record = SteelWeldInspection(
        project_id=project_id,
        inspection_rate=round(inspection_rate, 2),
        pass_rate=round(pass_rate, 2),
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/stats")
def steel_inspection_stats(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    rows = db.query(SteelWeldInspection).filter(SteelWeldInspection.project_id == project_id).all()
    if not rows:
        return {"total_joints": 0, "pass_rate_overall": 0, "by_method": {}}

    total_joints = sum(r.total_joints for r in rows)
    total_passed = sum(r.passed_joints for r in rows)
    total_inspected = sum(r.inspected_joints for r in rows)
    pass_rate_overall = round(total_passed / total_inspected * 100, 2) if total_inspected > 0 else 0.0

    by_method: dict[str, dict] = {}
    for r in rows:
        m = r.inspection_method
        if m not in by_method:
            by_method[m] = {"total_joints": 0, "inspected_joints": 0, "passed_joints": 0, "failed_joints": 0}
        by_method[m]["total_joints"] += r.total_joints
        by_method[m]["inspected_joints"] += r.inspected_joints
        by_method[m]["passed_joints"] += r.passed_joints
        by_method[m]["failed_joints"] += r.failed_joints

    for m, v in by_method.items():
        v["pass_rate"] = round(v["passed_joints"] / v["inspected_joints"] * 100, 2) if v["inspected_joints"] > 0 else 0.0

    return {
        "total_joints": total_joints,
        "pass_rate_overall": pass_rate_overall,
        "by_method": by_method,
    }


@router.get("/{inspection_id}")
def get_steel_inspection(
    project_id: str,
    inspection_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(SteelWeldInspection).filter(
        SteelWeldInspection.id == inspection_id,
        SteelWeldInspection.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="検査記録が見つかりません")
    return record
