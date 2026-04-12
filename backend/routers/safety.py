"""Safety management (安全管理) router - KY, patrols, incidents, trainings, orientations."""

import asyncio
from datetime import date
from collections import defaultdict

from services.timezone_utils import today_jst

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.safety import KYActivity, SafetyPatrol, IncidentReport, SafetyTraining, WorkerOrientation
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.storage_service import generate_upload_key, upload_file
from services.photo_service import extract_exif
from services.errors import AppError

router = APIRouter(prefix="/api/projects/{project_id}/safety", tags=["safety"])


# ---------- Schemas ----------

class KYActivityCreate(BaseModel):
    activity_date: date
    location: str | None = None
    work_content: str | None = None
    hazards: list | None = None
    participants: list | None = None
    leader_name: str | None = None


class KYActivityUpdate(BaseModel):
    location: str | None = None
    work_content: str | None = None
    hazards: list | None = None
    participants: list | None = None
    leader_name: str | None = None


class SafetyPatrolCreate(BaseModel):
    patrol_date: date
    inspector_name: str | None = None
    checklist: list | None = None
    overall_evaluation: str | None = None
    corrective_actions: str | None = None
    photo_ids: list | None = None


class SafetyPatrolUpdate(BaseModel):
    inspector_name: str | None = None
    checklist: list | None = None
    overall_evaluation: str | None = None
    corrective_actions: str | None = None
    photo_ids: list | None = None


class IncidentReportCreate(BaseModel):
    incident_date: date
    incident_type: str
    severity: str = "minor"
    location: str | None = None
    description: str | None = None
    cause_analysis: str | None = None
    corrective_action: str | None = None
    photo_ids: list | None = None


class IncidentReportUpdate(BaseModel):
    severity: str | None = None
    location: str | None = None
    description: str | None = None
    cause_analysis: str | None = None
    corrective_action: str | None = None
    status: str | None = None
    photo_ids: list | None = None


class SafetyTrainingCreate(BaseModel):
    training_date: date
    training_type: str
    title: str
    content: str | None = None
    instructor_name: str | None = None
    attendees: list | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    attachment_keys: list | None = None


class SafetyTrainingUpdate(BaseModel):
    content: str | None = None
    instructor_name: str | None = None
    attendees: list | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    attachment_keys: list | None = None


class WorkerOrientationCreate(BaseModel):
    worker_id: str
    orientation_date: date
    instructor_name: str | None = None
    topics_covered: list | None = None
    health_check_passed: bool = False
    insurance_verified: bool = False
    safety_pledge_signed: bool = False
    blood_type_confirmed: bool = False
    emergency_contact_verified: bool = False
    notes: str | None = None


class WorkerOrientationUpdate(BaseModel):
    instructor_name: str | None = None
    topics_covered: list | None = None
    health_check_passed: bool | None = None
    insurance_verified: bool | None = None
    safety_pledge_signed: bool | None = None
    blood_type_confirmed: bool | None = None
    emergency_contact_verified: bool | None = None
    notes: str | None = None


# ---------- KY Activities ----------

@router.get("/ky-activities")
def list_ky_activities(
    project_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(KYActivity).filter(KYActivity.project_id == project_id)
    return q.order_by(KYActivity.activity_date.desc()).offset(offset).limit(limit).all()


@router.post("/ky-activities")
def create_ky_activity(
    project_id: str,
    req: KYActivityCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ky = KYActivity(project_id=project_id, created_by=user.id, **req.model_dump())
    db.add(ky)
    db.commit()
    db.refresh(ky)
    return ky


@router.get("/ky-activities/{ky_id}")
def get_ky_activity(
    project_id: str, ky_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ky = db.query(KYActivity).filter(KYActivity.id == ky_id, KYActivity.project_id == project_id).first()
    if not ky:
        raise HTTPException(status_code=404, detail="KY活動が見つかりません")
    return ky


@router.put("/ky-activities/{ky_id}")
def update_ky_activity(
    project_id: str, ky_id: str, req: KYActivityUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ky = db.query(KYActivity).filter(KYActivity.id == ky_id, KYActivity.project_id == project_id).first()
    if not ky:
        raise HTTPException(status_code=404, detail="KY活動が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(ky, k, v)
    db.commit()
    db.refresh(ky)
    return ky


@router.delete("/ky-activities/{ky_id}")
def delete_ky_activity(
    project_id: str, ky_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ky = db.query(KYActivity).filter(KYActivity.id == ky_id, KYActivity.project_id == project_id).first()
    if not ky:
        raise HTTPException(status_code=404, detail="KY活動が見つかりません")
    db.delete(ky)
    db.commit()
    return {"status": "ok"}


# ---------- Patrols ----------

@router.get("/patrols")
def list_patrols(
    project_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(SafetyPatrol).filter(
        SafetyPatrol.project_id == project_id
    ).order_by(SafetyPatrol.patrol_date.desc()).offset(offset).limit(limit).all()


@router.post("/patrols")
def create_patrol(
    project_id: str, req: SafetyPatrolCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    patrol = SafetyPatrol(project_id=project_id, created_by=user.id, **req.model_dump())
    db.add(patrol)
    db.commit()
    db.refresh(patrol)
    return patrol


@router.get("/patrols/{patrol_id}")
def get_patrol(
    project_id: str, patrol_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    patrol = db.query(SafetyPatrol).filter(SafetyPatrol.id == patrol_id, SafetyPatrol.project_id == project_id).first()
    if not patrol:
        raise HTTPException(status_code=404, detail="安全パトロールが見つかりません")
    return patrol


@router.put("/patrols/{patrol_id}")
def update_patrol(
    project_id: str, patrol_id: str, req: SafetyPatrolUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    patrol = db.query(SafetyPatrol).filter(SafetyPatrol.id == patrol_id, SafetyPatrol.project_id == project_id).first()
    if not patrol:
        raise HTTPException(status_code=404, detail="安全パトロールが見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(patrol, k, v)
    db.commit()
    db.refresh(patrol)
    return patrol


@router.delete("/patrols/{patrol_id}")
def delete_patrol(
    project_id: str, patrol_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    patrol = db.query(SafetyPatrol).filter(SafetyPatrol.id == patrol_id, SafetyPatrol.project_id == project_id).first()
    if not patrol:
        raise HTTPException(status_code=404, detail="安全パトロールが見つかりません")
    db.delete(patrol)
    db.commit()
    return {"status": "ok"}


# ---------- Incidents ----------

@router.get("/incidents")
def list_incidents(
    project_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(IncidentReport).filter(
        IncidentReport.project_id == project_id
    ).order_by(IncidentReport.incident_date.desc()).offset(offset).limit(limit).all()


@router.post("/incidents")
def create_incident(
    project_id: str, req: IncidentReportCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    incident = IncidentReport(project_id=project_id, reporter_id=user.id, **req.model_dump())
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/incidents/{incident_id}")
def get_incident(
    project_id: str, incident_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    inc = db.query(IncidentReport).filter(IncidentReport.id == incident_id, IncidentReport.project_id == project_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="事故報告が見つかりません")
    return inc


@router.put("/incidents/{incident_id}")
def update_incident(
    project_id: str, incident_id: str, req: IncidentReportUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    inc = db.query(IncidentReport).filter(IncidentReport.id == incident_id, IncidentReport.project_id == project_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="事故報告が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(inc, k, v)
    db.commit()
    db.refresh(inc)
    return inc


@router.delete("/incidents/{incident_id}")
def delete_incident(
    project_id: str, incident_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    inc = db.query(IncidentReport).filter(IncidentReport.id == incident_id, IncidentReport.project_id == project_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="事故報告が見つかりません")
    db.delete(inc)
    db.commit()
    return {"status": "ok"}


# ---------- Quick Near-miss (ヒヤリハット) Report ----------

@router.post("/quick-incident")
async def quick_incident_report(
    project_id: str,
    description: str = Form(...),
    severity: str = Form("medium"),  # low, medium, high, critical
    file: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """Simplified near-miss (ヒヤリハット) report - minimal fields, photo optional."""
    valid_severities = {"low", "medium", "high", "critical"}
    if severity not in valid_severities:
        raise AppError(400, f"severity は {valid_severities} のいずれかを指定してください", "INVALID_SEVERITY")

    location: str | None = None
    photo_key: str | None = None

    if file:
        file_data = await file.read()

        # extract_exif + upload_file はブロッキングI/O → スレッドプールで実行
        def _process_incident_file():
            exif = extract_exif(file_data)
            file_key = generate_upload_key(user.tenant_id, project_id, "incidents", file.filename or "incident.jpg")
            upload_file(file_data, file_key, file.content_type or "image/jpeg")
            return exif, file_key

        exif, file_key = await asyncio.to_thread(_process_incident_file)

        if exif.get("gps_lat") and exif.get("gps_lng"):
            location = f"{exif['gps_lat']:.6f}, {exif['gps_lng']:.6f}"
        photo_key = file_key

    incident = IncidentReport(
        project_id=project_id,
        reporter_id=user.id,
        incident_date=today_jst(),
        incident_type="near_miss",
        severity=severity,
        location=location,
        description=description,
        photo_ids=[photo_key] if photo_key else None,
        status="reported",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


# ---------- Safety Trends ----------

@router.get("/trends")
def safety_trends(
    project_id: str,
    months: int = 6,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """Monthly counts of KY activities, patrols, incidents, trainings."""
    today = today_jst()

    # Build month list
    month_labels = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        month_labels.append((y, m))

    result = []
    for y, m in month_labels:
        label = f"{y}-{m:02d}"
        start = date(y, m, 1)
        end = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)

        ky_count = db.query(func.count(KYActivity.id)).filter(
            KYActivity.project_id == project_id,
            KYActivity.activity_date >= start,
            KYActivity.activity_date < end,
        ).scalar() or 0

        patrol_count = db.query(func.count(SafetyPatrol.id)).filter(
            SafetyPatrol.project_id == project_id,
            SafetyPatrol.patrol_date >= start,
            SafetyPatrol.patrol_date < end,
        ).scalar() or 0

        incident_count = db.query(func.count(IncidentReport.id)).filter(
            IncidentReport.project_id == project_id,
            IncidentReport.incident_date >= start,
            IncidentReport.incident_date < end,
        ).scalar() or 0

        training_count = db.query(func.count(SafetyTraining.id)).filter(
            SafetyTraining.project_id == project_id,
            SafetyTraining.training_date >= start,
            SafetyTraining.training_date < end,
        ).scalar() or 0

        result.append({
            "month": label,
            "ky_count": int(ky_count),
            "patrol_count": int(patrol_count),
            "incident_count": int(incident_count),
            "training_count": int(training_count),
        })

    return result


# ---------- Incident Analysis ----------

@router.get("/incident-analysis")
def incident_analysis(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """Breakdown of incidents by severity, type, and location."""
    incidents = db.query(IncidentReport).filter(
        IncidentReport.project_id == project_id
    ).all()

    by_severity: dict[str, int] = defaultdict(int)
    by_type: dict[str, int] = defaultdict(int)
    by_location: dict[str, int] = defaultdict(int)
    by_status: dict[str, int] = defaultdict(int)

    for inc in incidents:
        by_severity[inc.severity] += 1
        by_type[inc.incident_type] += 1
        loc = inc.location or "不明"
        by_location[loc] += 1
        by_status[inc.status] += 1

    return {
        "total": len(incidents),
        "by_severity": dict(by_severity),
        "by_type": dict(by_type),
        "by_location": dict(by_location),
        "by_status": dict(by_status),
    }


# ---------- Trainings ----------

@router.get("/trainings")
def list_trainings(
    project_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(SafetyTraining).filter(
        SafetyTraining.project_id == project_id
    ).order_by(SafetyTraining.training_date.desc()).offset(offset).limit(limit).all()


@router.post("/trainings")
def create_training(
    project_id: str, req: SafetyTrainingCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    training = SafetyTraining(project_id=project_id, created_by=user.id, **req.model_dump())
    db.add(training)
    db.commit()
    db.refresh(training)
    return training


@router.get("/trainings/{training_id}")
def get_training(
    project_id: str, training_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    t = db.query(SafetyTraining).filter(SafetyTraining.id == training_id, SafetyTraining.project_id == project_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="安全教育が見つかりません")
    return t


@router.put("/trainings/{training_id}")
def update_training(
    project_id: str, training_id: str, req: SafetyTrainingUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    t = db.query(SafetyTraining).filter(SafetyTraining.id == training_id, SafetyTraining.project_id == project_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="安全教育が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/trainings/{training_id}")
def delete_training(
    project_id: str, training_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    t = db.query(SafetyTraining).filter(SafetyTraining.id == training_id, SafetyTraining.project_id == project_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="安全教育が見つかりません")
    db.delete(t)
    db.commit()
    return {"status": "ok"}


# ---------- Worker Orientations ----------

@router.get("/worker-orientations")
def list_orientations(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(WorkerOrientation).filter(
        WorkerOrientation.project_id == project_id
    ).order_by(WorkerOrientation.orientation_date.desc()).all()


@router.post("/worker-orientations")
def create_orientation(
    project_id: str,
    req: WorkerOrientationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    orientation = WorkerOrientation(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(orientation)
    db.commit()
    db.refresh(orientation)
    return orientation


@router.get("/worker-orientations/{orientation_id}")
def get_orientation(
    project_id: str, orientation_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    o = db.query(WorkerOrientation).filter(
        WorkerOrientation.id == orientation_id,
        WorkerOrientation.project_id == project_id,
    ).first()
    if not o:
        raise HTTPException(status_code=404, detail="入場者教育記録が見つかりません")
    return o


@router.put("/worker-orientations/{orientation_id}")
def update_orientation(
    project_id: str, orientation_id: str, req: WorkerOrientationUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    o = db.query(WorkerOrientation).filter(
        WorkerOrientation.id == orientation_id,
        WorkerOrientation.project_id == project_id,
    ).first()
    if not o:
        raise HTTPException(status_code=404, detail="入場者教育記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(o, k, v)
    db.commit()
    db.refresh(o)
    return o


@router.delete("/worker-orientations/{orientation_id}")
def delete_orientation(
    project_id: str, orientation_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    o = db.query(WorkerOrientation).filter(
        WorkerOrientation.id == orientation_id,
        WorkerOrientation.project_id == project_id,
    ).first()
    if not o:
        raise HTTPException(status_code=404, detail="入場者教育記録が見つかりません")
    db.delete(o)
    db.commit()
    return {"status": "ok"}
