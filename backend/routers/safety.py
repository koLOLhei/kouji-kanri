"""Safety management (安全管理) router - KY, patrols, incidents, trainings."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.safety import KYActivity, SafetyPatrol, IncidentReport, SafetyTraining
from models.user import User
from services.auth_service import get_current_user

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
    duration_minutes: int | None = None
    attachment_keys: list | None = None


class SafetyTrainingUpdate(BaseModel):
    content: str | None = None
    instructor_name: str | None = None
    attendees: list | None = None
    duration_minutes: int | None = None
    attachment_keys: list | None = None


# ---------- KY Activities ----------

@router.get("/ky-activities")
def list_ky_activities(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(KYActivity).filter(
        KYActivity.project_id == project_id
    ).order_by(KYActivity.activity_date.desc()).all()


@router.post("/ky-activities")
def create_ky_activity(
    project_id: str,
    req: KYActivityCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
    ky = db.query(KYActivity).filter(KYActivity.id == ky_id, KYActivity.project_id == project_id).first()
    if not ky:
        raise HTTPException(status_code=404, detail="KY活動が見つかりません")
    return ky


@router.put("/ky-activities/{ky_id}")
def update_ky_activity(
    project_id: str, ky_id: str, req: KYActivityUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
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
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return db.query(SafetyPatrol).filter(
        SafetyPatrol.project_id == project_id
    ).order_by(SafetyPatrol.patrol_date.desc()).all()


@router.post("/patrols")
def create_patrol(
    project_id: str, req: SafetyPatrolCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
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
    patrol = db.query(SafetyPatrol).filter(SafetyPatrol.id == patrol_id, SafetyPatrol.project_id == project_id).first()
    if not patrol:
        raise HTTPException(status_code=404, detail="安全パトロールが見つかりません")
    return patrol


@router.put("/patrols/{patrol_id}")
def update_patrol(
    project_id: str, patrol_id: str, req: SafetyPatrolUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
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
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return db.query(IncidentReport).filter(
        IncidentReport.project_id == project_id
    ).order_by(IncidentReport.incident_date.desc()).all()


@router.post("/incidents")
def create_incident(
    project_id: str, req: IncidentReportCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
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
    inc = db.query(IncidentReport).filter(IncidentReport.id == incident_id, IncidentReport.project_id == project_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="事故報告が見つかりません")
    return inc


@router.put("/incidents/{incident_id}")
def update_incident(
    project_id: str, incident_id: str, req: IncidentReportUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
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
    inc = db.query(IncidentReport).filter(IncidentReport.id == incident_id, IncidentReport.project_id == project_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="事故報告が見つかりません")
    db.delete(inc)
    db.commit()
    return {"status": "ok"}


# ---------- Trainings ----------

@router.get("/trainings")
def list_trainings(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return db.query(SafetyTraining).filter(
        SafetyTraining.project_id == project_id
    ).order_by(SafetyTraining.training_date.desc()).all()


@router.post("/trainings")
def create_training(
    project_id: str, req: SafetyTrainingCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
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
    t = db.query(SafetyTraining).filter(SafetyTraining.id == training_id, SafetyTraining.project_id == project_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="安全教育が見つかりません")
    return t


@router.put("/trainings/{training_id}")
def update_training(
    project_id: str, training_id: str, req: SafetyTrainingUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
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
    t = db.query(SafetyTraining).filter(SafetyTraining.id == training_id, SafetyTraining.project_id == project_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="安全教育が見つかりません")
    db.delete(t)
    db.commit()
    return {"status": "ok"}
