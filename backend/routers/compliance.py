"""Compliance management router (許認可・届出管理)."""

from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.compliance import ComplianceItem
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/compliance", tags=["compliance"])

# ---------- Pre-defined templates ----------

COMPLIANCE_TEMPLATES = [
    {
        "item_type": "road_occupancy",
        "title": "道路使用許可",
        "authority": "所轄警察署",
        "notes": "道路を使用する工事の場合、工事開始の少なくとも1週間前までに申請が必要です。",
    },
    {
        "item_type": "road_excavation",
        "title": "道路占用許可",
        "authority": "道路管理者（市区町村・都道府県・国交省）",
        "notes": "道路を掘削する場合は道路占用許可が必要です。",
    },
    {
        "item_type": "building_permit",
        "title": "建築確認申請",
        "authority": "建築主事または指定確認検査機関",
        "notes": "新築・増改築工事の着工前に必要です。",
    },
    {
        "item_type": "noise_permit",
        "title": "騒音規制法に基づく届出",
        "authority": "市区町村長",
        "notes": "特定建設作業（くい打ち、さく岩機使用等）の開始7日前までに届出が必要です。",
    },
    {
        "item_type": "vibration_permit",
        "title": "振動規制法に基づく届出",
        "authority": "市区町村長",
        "notes": "特定建設作業の開始7日前までに届出が必要です。",
    },
    {
        "item_type": "waste_disposal",
        "title": "廃棄物処理計画届出",
        "authority": "都道府県知事",
        "notes": "一定規模以上の工事は廃棄物処理計画書の提出が必要です。",
    },
    {
        "item_type": "scaffolding",
        "title": "足場設置届",
        "authority": "労働基準監督署",
        "notes": "高さ10m以上の足場の設置・変更・解体は30日前までに届出が必要です。",
    },
    {
        "item_type": "crane_setup",
        "title": "クレーン設置届",
        "authority": "労働基準監督署",
        "notes": "つり上げ荷重3t以上のクレーンは設置30日前に届出が必要です。",
    },
    {
        "item_type": "fire_prevention",
        "title": "火気使用工事届",
        "authority": "所轄消防署",
        "notes": "溶接・溶断等の火気を使用する工事の前に届出が必要です。",
    },
    {
        "item_type": "dust_measures",
        "title": "大気汚染防止法に基づく届出（粉じん）",
        "authority": "都道府県知事",
        "notes": "石綿含有建材の解体工事等に必要です。",
    },
]


# ---------- Pydantic schemas ----------

class ComplianceCreate(BaseModel):
    item_type: str
    title: str
    authority: str
    deadline: date | None = None
    status: str = "not_started"
    reference_number: str | None = None
    notes: str | None = None
    attachments: list | None = None


class ComplianceUpdate(BaseModel):
    item_type: str | None = None
    title: str | None = None
    authority: str | None = None
    deadline: date | None = None
    status: str | None = None
    reference_number: str | None = None
    notes: str | None = None
    attachments: list | None = None


# ---------- Helpers ----------

VALID_STATUSES = {"not_started", "preparing", "submitted", "approved", "expired"}
STATUS_LABELS = {
    "not_started": "未着手",
    "preparing": "準備中",
    "submitted": "提出済",
    "approved": "承認済",
    "expired": "期限切れ",
}


def _serialize(item: ComplianceItem, today: date | None = None) -> dict[str, Any]:
    if today is None:
        today = date.today()
    days_until_deadline = None
    is_overdue = False
    if item.deadline:
        days_until_deadline = (item.deadline - today).days
        is_overdue = days_until_deadline < 0 and item.status not in {"approved"}

    return {
        "id": item.id,
        "project_id": item.project_id,
        "item_type": item.item_type,
        "title": item.title,
        "authority": item.authority,
        "deadline": item.deadline.isoformat() if item.deadline else None,
        "status": item.status,
        "status_label": STATUS_LABELS.get(item.status, item.status),
        "reference_number": item.reference_number,
        "notes": item.notes,
        "attachments": item.attachments or [],
        "days_until_deadline": days_until_deadline,
        "is_overdue": is_overdue,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


# ---------- Endpoints ----------

@router.get("")
def list_compliance_items(
    project_id: str,
    status: str | None = Query(default=None),
    item_type: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """List all compliance items for a project."""
    verify_project_access(project_id, user, db)
    q = db.query(ComplianceItem).filter(ComplianceItem.project_id == project_id)
    if status:
        q = q.filter(ComplianceItem.status == status)
    if item_type:
        q = q.filter(ComplianceItem.item_type == item_type)
    items = q.order_by(ComplianceItem.deadline.asc().nullslast(), ComplianceItem.created_at).all()
    today = date.today()
    return [_serialize(i, today) for i in items]


@router.post("")
def create_compliance_item(
    project_id: str,
    req: ComplianceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Create a new compliance item."""
    project = verify_project_access(project_id, user, db)
    if req.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"無効なステータス: {req.status}")
    item = ComplianceItem(
        project_id=project_id,
        tenant_id=user.tenant_id,
        created_by=user.id,
        updated_by=user.id,
        **req.model_dump(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.put("/{item_id}")
def update_compliance_item(
    project_id: str,
    item_id: str,
    req: ComplianceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Update a compliance item."""
    verify_project_access(project_id, user, db)
    item = db.query(ComplianceItem).filter(
        ComplianceItem.id == item_id,
        ComplianceItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="アイテムが見つかりません")
    update_data = req.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"無効なステータス: {update_data['status']}")
    for k, v in update_data.items():
        setattr(item, k, v)
    item.updated_by = user.id
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.delete("/{item_id}")
def delete_compliance_item(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Delete a compliance item."""
    verify_project_access(project_id, user, db)
    item = db.query(ComplianceItem).filter(
        ComplianceItem.id == item_id,
        ComplianceItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="アイテムが見つかりません")
    db.delete(item)
    db.commit()
    return {"status": "ok"}


@router.get("/overdue")
def list_overdue_compliance_items(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """List compliance items that are overdue (deadline passed, not approved)."""
    verify_project_access(project_id, user, db)
    today = date.today()
    items = (
        db.query(ComplianceItem)
        .filter(
            ComplianceItem.project_id == project_id,
            ComplianceItem.deadline < today,
            ComplianceItem.status.notin_(["approved"]),
        )
        .order_by(ComplianceItem.deadline)
        .all()
    )
    return [_serialize(i, today) for i in items]


@router.get("/templates")
def get_compliance_templates(
    project_id: str,  # noqa: ARG001 – required by path prefix
    user: User = Depends(get_current_user),  # noqa: ARG001 – auth check
    db: Session = Depends(get_db),  # noqa: ARG001
) -> list[dict]:
    """Return pre-defined compliance templates for common permits."""
    return COMPLIANCE_TEMPLATES
