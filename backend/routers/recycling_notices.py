"""建設リサイクル法 (Construction Recycling Act) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.recycling import RecyclingNotice
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/recycling-notices", tags=["recycling-notices"])


# ---------- Schemas ----------

class RecyclingNoticeCreate(BaseModel):
    notice_type: str  # "pre_construction", "completion"
    submission_date: date | None = None
    authority: str | None = None
    building_area: float | None = None
    total_floor_area: float | None = None
    demolition_type: str | None = None
    materials_json: list | None = None
    status: str = "draft"
    reference_number: str | None = None


class RecyclingNoticeUpdate(BaseModel):
    notice_type: str | None = None
    submission_date: date | None = None
    authority: str | None = None
    building_area: float | None = None
    total_floor_area: float | None = None
    demolition_type: str | None = None
    materials_json: list | None = None
    status: str | None = None
    reference_number: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_recycling_notices(
    project_id: str,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(RecyclingNotice).filter(
        RecyclingNotice.project_id == project_id,
        RecyclingNotice.tenant_id == user.tenant_id,
    )
    if status:
        q = q.filter(RecyclingNotice.status == status)
    return q.order_by(RecyclingNotice.created_at.desc()).offset(offset).limit(limit).all()


@router.post("")
def create_recycling_notice(
    project_id: str,
    req: RecyclingNoticeCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    notice = RecyclingNotice(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


@router.get("/{notice_id}")
def get_recycling_notice(
    project_id: str,
    notice_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    notice = db.query(RecyclingNotice).filter(
        RecyclingNotice.id == notice_id,
        RecyclingNotice.project_id == project_id,
        RecyclingNotice.tenant_id == user.tenant_id,
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="建設リサイクル法届出が見つかりません")
    return notice


@router.put("/{notice_id}")
def update_recycling_notice(
    project_id: str,
    notice_id: str,
    req: RecyclingNoticeUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    notice = db.query(RecyclingNotice).filter(
        RecyclingNotice.id == notice_id,
        RecyclingNotice.project_id == project_id,
        RecyclingNotice.tenant_id == user.tenant_id,
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="建設リサイクル法届出が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(notice, k, v)
    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/{notice_id}")
def delete_recycling_notice(
    project_id: str,
    notice_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    notice = db.query(RecyclingNotice).filter(
        RecyclingNotice.id == notice_id,
        RecyclingNotice.project_id == project_id,
        RecyclingNotice.tenant_id == user.tenant_id,
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="建設リサイクル法届出が見つかりません")
    db.delete(notice)
    db.commit()
    return {"status": "ok"}
