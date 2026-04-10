"""Equipment (機材) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.equipment import Equipment, EquipmentDailyCheck, EquipmentUsage
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

equipment_router = APIRouter(prefix="/api/equipment", tags=["equipment"])
project_equipment_router = APIRouter(tags=["equipment"])


# ---------- Schemas ----------

class EquipmentCreate(BaseModel):
    name: str
    equipment_type: str | None = None
    model_number: str | None = None
    registration_number: str | None = None
    owner_company: str | None = None
    inspection_expiry: date | None = None
    capacity: str | None = None


class EquipmentUpdate(BaseModel):
    name: str | None = None
    equipment_type: str | None = None
    model_number: str | None = None
    registration_number: str | None = None
    owner_company: str | None = None
    inspection_expiry: date | None = None
    capacity: str | None = None


class DailyCheckCreate(BaseModel):
    equipment_id: str
    check_date: date
    operator_name: str | None = None
    checklist: list | None = None
    overall_result: str | None = None  # pass / fail


class EquipmentUsageCreate(BaseModel):
    equipment_id: str
    usage_date: date
    hours: float | None = None
    work_description: str | None = None
    operator_name: str | None = None


# ---------- Equipment CRUD (tenant-scoped) ----------

@equipment_router.get("")
def list_equipment(
    equipment_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Equipment).filter(Equipment.tenant_id == user.tenant_id)
    if equipment_type:
        q = q.filter(Equipment.equipment_type == equipment_type)
    return q.order_by(Equipment.name).all()


@equipment_router.post("")
def create_equipment(
    req: EquipmentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    equip = Equipment(
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(equip)
    db.commit()
    db.refresh(equip)
    return equip


@equipment_router.get("/{equipment_id}")
def get_equipment(
    equipment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    equip = db.query(Equipment).filter(
        Equipment.id == equipment_id, Equipment.tenant_id == user.tenant_id
    ).first()
    if not equip:
        raise HTTPException(status_code=404, detail="機材が見つかりません")
    return equip


@equipment_router.put("/{equipment_id}")
def update_equipment(
    equipment_id: str,
    req: EquipmentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    equip = db.query(Equipment).filter(
        Equipment.id == equipment_id, Equipment.tenant_id == user.tenant_id
    ).first()
    if not equip:
        raise HTTPException(status_code=404, detail="機材が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(equip, k, v)
    db.commit()
    db.refresh(equip)
    return equip


# ---------- Equipment Daily Check (project-scoped) ----------

@project_equipment_router.get("/api/projects/{project_id}/equipment-checks")
def list_equipment_checks(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return (
        db.query(EquipmentDailyCheck)
        .filter(EquipmentDailyCheck.project_id == project_id)
        .order_by(EquipmentDailyCheck.check_date.desc())
        .all()
    )


@project_equipment_router.post("/api/projects/{project_id}/equipment-checks")
def create_equipment_check(
    project_id: str,
    req: DailyCheckCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    check = EquipmentDailyCheck(
        project_id=project_id,
        **req.model_dump(),
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    return check


# ---------- Equipment Usage (project-scoped) ----------

@project_equipment_router.get("/api/projects/{project_id}/equipment-usage")
def list_equipment_usage(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return (
        db.query(EquipmentUsage)
        .filter(EquipmentUsage.project_id == project_id)
        .order_by(EquipmentUsage.usage_date.desc())
        .all()
    )


@project_equipment_router.post("/api/projects/{project_id}/equipment-usage")
def create_equipment_usage(
    project_id: str,
    req: EquipmentUsageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    usage = EquipmentUsage(
        project_id=project_id,
        **req.model_dump(),
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage
