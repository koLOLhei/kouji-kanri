"""システムお知らせ (SystemAnnouncement) + 契約書管理 (ContractDocument) router."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import SystemAnnouncement, ContractDocument
from models.user import User
from services.auth_service import get_current_user, require_role

router = APIRouter(tags=["announcements", "contracts"])


# ---------- Schemas ----------

class AnnouncementCreate(BaseModel):
    title: str
    content: str | None = None
    announcement_type: str = "info"
    is_published: bool = False


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    announcement_type: str | None = None
    is_published: bool | None = None


class ContractCreate(BaseModel):
    project_id: str | None = None
    contract_type: str
    title: str
    counterparty: str | None = None
    contract_amount: int | None = None
    signed_date: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    file_key: str | None = None
    status: str = "draft"
    notes: str | None = None


class ContractUpdate(BaseModel):
    project_id: str | None = None
    contract_type: str | None = None
    title: str | None = None
    counterparty: str | None = None
    contract_amount: int | None = None
    signed_date: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    file_key: str | None = None
    status: str | None = None
    notes: str | None = None


# ---------- Announcement Endpoints ----------

@router.get("/api/announcements")
def list_announcements(
    db: Session = Depends(get_db),
):
    """Public: no auth required. Returns published announcements."""
    return db.query(SystemAnnouncement).filter(
        SystemAnnouncement.is_published == True,
    ).order_by(SystemAnnouncement.published_at.desc()).all()


@router.post("/api/announcements", status_code=201)
def create_announcement(
    body: AnnouncementCreate,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    data = body.model_dump()
    if data.get("is_published"):
        published_at = datetime.now(timezone.utc)
    else:
        published_at = None
    record = SystemAnnouncement(
        published_at=published_at,
        **data,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/api/announcements/{announcement_id}")
def update_announcement(
    announcement_id: str,
    body: AnnouncementUpdate,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    record = db.query(SystemAnnouncement).filter(
        SystemAnnouncement.id == announcement_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="お知らせが見つかりません")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(record, k, v)
    # Set published_at when publishing
    if data.get("is_published") and not record.published_at:
        record.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record


# ---------- Contract Endpoints ----------

@router.get("/api/contracts")
def list_contracts(
    contract_type: str | None = None,
    project_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(ContractDocument).filter(ContractDocument.tenant_id == user.tenant_id)
    if contract_type:
        q = q.filter(ContractDocument.contract_type == contract_type)
    if project_id:
        q = q.filter(ContractDocument.project_id == project_id)
    return q.order_by(ContractDocument.created_at.desc()).all()


@router.post("/api/contracts", status_code=201)
def create_contract(
    body: ContractCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = ContractDocument(
        tenant_id=user.tenant_id,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/api/contracts/{contract_id}")
def get_contract(
    contract_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(ContractDocument).filter(
        ContractDocument.id == contract_id,
        ContractDocument.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="契約書が見つかりません")
    return record


@router.put("/api/contracts/{contract_id}")
def update_contract(
    contract_id: str,
    body: ContractUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(ContractDocument).filter(
        ContractDocument.id == contract_id,
        ContractDocument.tenant_id == user.tenant_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="契約書が見つかりません")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record
