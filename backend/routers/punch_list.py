"""Punch List / Defect Management router (パンチリスト・指摘事項管理)."""

from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.punch_list import PunchListItem
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(
    prefix="/api/projects/{project_id}/punch-list", tags=["punch-list"]
)


# ─── Schemas ───

class PunchListCreate(BaseModel):
    location: str
    title: str
    description: str | None = None
    severity: str = "minor"
    reported_by: str
    reported_by_role: str = "inspector"
    assigned_to: str | None = None
    photo_ids: list | None = None
    due_date: date | None = None


class PunchListUpdate(BaseModel):
    location: str | None = None
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    photo_ids: list | None = None
    resolution_photo_ids: list | None = None
    resolution_notes: str | None = None
    due_date: date | None = None


class ResolveRequest(BaseModel):
    resolution_notes: str | None = None
    resolution_photo_ids: list | None = None


def _to_dict(item: PunchListItem) -> dict:
    return {c.name: getattr(item, c.name) for c in item.__table__.columns}


# ─── Endpoints ───

@router.get("")
def list_punch_list(
    project_id: str,
    status: str | None = None,
    severity: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """パンチリスト一覧取得。status/severity でフィルタ可能。"""
    verify_project_access(project_id, user, db)
    q = db.query(PunchListItem).filter(
        PunchListItem.project_id == project_id,
        PunchListItem.tenant_id == user.tenant_id,
    )
    if status:
        q = q.filter(PunchListItem.status == status)
    if severity:
        q = q.filter(PunchListItem.severity == severity)
    items = q.order_by(PunchListItem.created_at.desc()).all()
    return [_to_dict(i) for i in items]


@router.post("")
def create_punch_list_item(
    project_id: str,
    req: PunchListCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """パンチリスト新規登録。"""
    verify_project_access(project_id, user, db)
    item = PunchListItem(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_dict(item)


@router.get("/summary")
def get_punch_list_summary(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ステータス・重要度別の件数サマリ。"""
    verify_project_access(project_id, user, db)

    base = db.query(PunchListItem).filter(
        PunchListItem.project_id == project_id,
        PunchListItem.tenant_id == user.tenant_id,
    )

    by_status = {
        row[0]: row[1]
        for row in base.with_entities(PunchListItem.status, func.count(PunchListItem.id))
        .group_by(PunchListItem.status)
        .all()
    }

    by_severity = {
        row[0]: row[1]
        for row in base.with_entities(PunchListItem.severity, func.count(PunchListItem.id))
        .group_by(PunchListItem.severity)
        .all()
    }

    total = base.count()
    open_count = by_status.get("open", 0) + by_status.get("in_progress", 0)

    return {
        "total": total,
        "open": open_count,
        "resolved": by_status.get("resolved", 0),
        "verified": by_status.get("verified", 0),
        "by_status": by_status,
        "by_severity": by_severity,
    }


@router.get("/{item_id}")
def get_punch_list_item(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    item = db.query(PunchListItem).filter(
        PunchListItem.id == item_id,
        PunchListItem.project_id == project_id,
        PunchListItem.tenant_id == user.tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="パンチリスト項目が見つかりません")
    return _to_dict(item)


@router.put("/{item_id}")
def update_punch_list_item(
    project_id: str,
    item_id: str,
    req: PunchListUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    item = db.query(PunchListItem).filter(
        PunchListItem.id == item_id,
        PunchListItem.project_id == project_id,
        PunchListItem.tenant_id == user.tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="パンチリスト項目が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return _to_dict(item)


@router.delete("/{item_id}")
def delete_punch_list_item(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    item = db.query(PunchListItem).filter(
        PunchListItem.id == item_id,
        PunchListItem.project_id == project_id,
        PunchListItem.tenant_id == user.tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="パンチリスト項目が見つかりません")
    db.delete(item)
    db.commit()
    return {"deleted": True}


@router.put("/{item_id}/resolve")
def resolve_punch_list_item(
    project_id: str,
    item_id: str,
    req: ResolveRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """是正完了としてマークする。"""
    verify_project_access(project_id, user, db)
    item = db.query(PunchListItem).filter(
        PunchListItem.id == item_id,
        PunchListItem.project_id == project_id,
        PunchListItem.tenant_id == user.tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="パンチリスト項目が見つかりません")
    if item.status == "verified":
        raise HTTPException(status_code=400, detail="既に検証済みです")
    item.status = "resolved"
    item.resolved_at = datetime.now(timezone.utc)
    if req.resolution_notes is not None:
        item.resolution_notes = req.resolution_notes
    if req.resolution_photo_ids is not None:
        item.resolution_photo_ids = req.resolution_photo_ids
    db.commit()
    db.refresh(item)
    return _to_dict(item)


@router.put("/{item_id}/verify")
def verify_punch_list_item(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """是正を検証済みとしてマークする（クライアント/監督者が使用）。"""
    verify_project_access(project_id, user, db)
    item = db.query(PunchListItem).filter(
        PunchListItem.id == item_id,
        PunchListItem.project_id == project_id,
        PunchListItem.tenant_id == user.tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="パンチリスト項目が見つかりません")
    if item.status != "resolved":
        raise HTTPException(status_code=400, detail="是正完了状態のみ検証できます")
    item.status = "verified"
    item.verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return _to_dict(item)
