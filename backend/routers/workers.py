"""Worker (作業員), qualification, attendance router."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.worker import Worker, WorkerQualification, Attendance
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["workers"])


# ---------- Schemas ----------

class WorkerCreate(BaseModel):
    name: str
    name_kana: str | None = None
    birth_date: date | None = None
    blood_type: str | None = None
    emergency_contact: str | None = None
    emergency_phone: str | None = None
    company_id: str | None = None
    notes: str | None = None


class WorkerUpdate(BaseModel):
    name: str | None = None
    name_kana: str | None = None
    birth_date: date | None = None
    blood_type: str | None = None
    emergency_contact: str | None = None
    emergency_phone: str | None = None
    company_id: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class QualificationCreate(BaseModel):
    qualification_name: str
    qualification_type: str
    certificate_number: str | None = None
    issued_date: date | None = None
    expiry_date: date | None = None
    issuing_authority: str | None = None
    certificate_file_key: str | None = None


class QualificationUpdate(BaseModel):
    qualification_name: str | None = None
    certificate_number: str | None = None
    expiry_date: date | None = None
    issuing_authority: str | None = None
    certificate_file_key: str | None = None


class AttendanceCreate(BaseModel):
    worker_id: str
    work_date: date
    check_in: datetime | None = None
    check_out: datetime | None = None
    work_hours: float | None = None
    work_type: str = "regular"
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    check_in: datetime | None = None
    check_out: datetime | None = None
    work_hours: float | None = None
    work_type: str | None = None
    notes: str | None = None


# ---------- Workers (tenant-scoped) ----------

@router.get("/workers")
def list_workers(
    is_active: bool | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Worker).filter(Worker.tenant_id == user.tenant_id)
    if is_active is not None:
        q = q.filter(Worker.is_active == is_active)
    return q.order_by(Worker.name).all()


@router.post("/workers")
def create_worker(
    req: WorkerCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    worker = Worker(tenant_id=user.tenant_id, **req.model_dump())
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker


@router.get("/workers/expiring-qualifications")
def expiring_qualifications(
    days: int = 30,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cutoff = date.today() + timedelta(days=days)
    quals = (
        db.query(WorkerQualification)
        .join(Worker, Worker.id == WorkerQualification.worker_id)
        .filter(
            Worker.tenant_id == user.tenant_id,
            WorkerQualification.expiry_date <= cutoff,
            WorkerQualification.expiry_date >= date.today(),
        )
        .order_by(WorkerQualification.expiry_date)
        .all()
    )
    return quals


@router.get("/workers/{worker_id}")
def get_worker(
    worker_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.tenant_id == user.tenant_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="作業員が見つかりません")
    return worker


@router.put("/workers/{worker_id}")
def update_worker(
    worker_id: str,
    req: WorkerUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.tenant_id == user.tenant_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="作業員が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(worker, k, v)
    db.commit()
    db.refresh(worker)
    return worker


@router.delete("/workers/{worker_id}")
def delete_worker(
    worker_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.tenant_id == user.tenant_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="作業員が見つかりません")
    worker.is_active = False
    db.commit()
    return {"status": "ok"}


# ---------- Qualifications (worker-scoped) ----------

@router.get("/workers/{worker_id}/qualifications")
def list_qualifications(
    worker_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(WorkerQualification).filter(
        WorkerQualification.worker_id == worker_id
    ).order_by(WorkerQualification.expiry_date).all()


@router.post("/workers/{worker_id}/qualifications")
def create_qualification(
    worker_id: str,
    req: QualificationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    qual = WorkerQualification(worker_id=worker_id, **req.model_dump())
    db.add(qual)
    db.commit()
    db.refresh(qual)
    return qual


@router.put("/workers/{worker_id}/qualifications/{qual_id}")
def update_qualification(
    worker_id: str,
    qual_id: str,
    req: QualificationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    qual = db.query(WorkerQualification).filter(
        WorkerQualification.id == qual_id, WorkerQualification.worker_id == worker_id
    ).first()
    if not qual:
        raise HTTPException(status_code=404, detail="資格が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(qual, k, v)
    db.commit()
    db.refresh(qual)
    return qual


@router.delete("/workers/{worker_id}/qualifications/{qual_id}")
def delete_qualification(
    worker_id: str,
    qual_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    qual = db.query(WorkerQualification).filter(
        WorkerQualification.id == qual_id, WorkerQualification.worker_id == worker_id
    ).first()
    if not qual:
        raise HTTPException(status_code=404, detail="資格が見つかりません")
    db.delete(qual)
    db.commit()
    return {"status": "ok"}


# ---------- Attendance (project-scoped) ----------

@router.get("/projects/{project_id}/attendance")
def list_attendance(
    project_id: str,
    work_date: date | None = None,
    worker_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Attendance).filter(Attendance.project_id == project_id)
    if work_date:
        q = q.filter(Attendance.work_date == work_date)
    if worker_id:
        q = q.filter(Attendance.worker_id == worker_id)
    return q.order_by(Attendance.work_date.desc()).all()


@router.post("/projects/{project_id}/attendance")
def create_attendance(
    project_id: str,
    req: AttendanceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    att = Attendance(project_id=project_id, **req.model_dump())
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


@router.put("/projects/{project_id}/attendance/{att_id}")
def update_attendance(
    project_id: str,
    att_id: str,
    req: AttendanceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    att = db.query(Attendance).filter(Attendance.id == att_id, Attendance.project_id == project_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="出勤記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(att, k, v)
    db.commit()
    db.refresh(att)
    return att


@router.delete("/projects/{project_id}/attendance/{att_id}")
def delete_attendance(
    project_id: str,
    att_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    att = db.query(Attendance).filter(Attendance.id == att_id, Attendance.project_id == project_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="出勤記録が見つかりません")
    db.delete(att)
    db.commit()
    return {"status": "ok"}


@router.get("/projects/{project_id}/attendance/summary")
def attendance_summary(
    project_id: str,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(
        Attendance.worker_id,
        func.count(Attendance.id).label("total_days"),
        func.sum(Attendance.work_hours).label("total_hours"),
    ).filter(Attendance.project_id == project_id)
    if date_from:
        q = q.filter(Attendance.work_date >= date_from)
    if date_to:
        q = q.filter(Attendance.work_date <= date_to)
    rows = q.group_by(Attendance.worker_id).all()
    return [
        {"worker_id": r.worker_id, "total_days": r.total_days, "total_hours": float(r.total_hours or 0)}
        for r in rows
    ]
