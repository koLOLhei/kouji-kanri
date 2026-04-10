"""Design Change (設計変更) router."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.design_change import DesignChange
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/design-changes", tags=["design-changes"])


# ---------- Schemas ----------

class DesignChangeItemSchema(BaseModel):
    item_name: str
    unit: str | None = None
    original_qty: float | None = None
    changed_qty: float | None = None
    unit_price: float | None = None
    original_amount: float | None = None
    changed_amount: float | None = None


class DesignChangeCreate(BaseModel):
    title: str
    reason: str | None = None
    description: str | None = None
    change_type: str = "設計変更"
    original_amount: float | None = None
    changed_amount: float | None = None
    difference_amount: float | None = None
    original_duration: int | None = None
    changed_duration: int | None = None
    items_json: list[dict] | None = None
    requested_by: str | None = None
    attachments: list[str] | None = None


class DesignChangeUpdate(BaseModel):
    title: str | None = None
    reason: str | None = None
    description: str | None = None
    change_type: str | None = None
    status: str | None = None
    original_amount: float | None = None
    changed_amount: float | None = None
    difference_amount: float | None = None
    original_duration: int | None = None
    changed_duration: int | None = None
    items_json: list[dict] | None = None
    requested_by: str | None = None
    approved_by: str | None = None
    attachments: list[str] | None = None


# ---------- Helpers ----------

def _get_next_change_number(project_id: str, db: Session) -> int:
    verify_project_access(project_id, user, db)
    max_num = db.query(func.max(DesignChange.change_number)).filter(
        DesignChange.project_id == project_id
    ).scalar()
    return (max_num or 0) + 1


def _calc_difference(dc: DesignChange) -> float | None:
    if dc.changed_amount is not None and dc.original_amount is not None:
        return dc.changed_amount - dc.original_amount
    return dc.difference_amount


# ---------- CRUD ----------

@router.get("")
def list_design_changes(
    project_id: str,
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(DesignChange).filter(
        DesignChange.project_id == project_id,
        DesignChange.tenant_id == user.tenant_id,
    )
    if status:
        q = q.filter(DesignChange.status == status)
    return q.order_by(DesignChange.change_number).all()


@router.post("")
def create_design_change(
    project_id: str,
    req: DesignChangeCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    change_number = _get_next_change_number(project_id, db)
    data = req.model_dump()
    # Auto-calculate difference
    if data.get("changed_amount") is not None and data.get("original_amount") is not None:
        data["difference_amount"] = data["changed_amount"] - data["original_amount"]
    dc = DesignChange(
        project_id=project_id,
        tenant_id=user.tenant_id,
        change_number=change_number,
        **data,
    )
    db.add(dc)
    db.commit()
    db.refresh(dc)
    return dc


@router.get("/summary")
def design_changes_summary(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """設計変更サマリー（件数・金額影響・工期影響）"""
    changes = db.query(DesignChange).filter(
        DesignChange.project_id == project_id,
        DesignChange.tenant_id == user.tenant_id,
    ).all()

    total = len(changes)
    approved = [c for c in changes if c.status == "approved"]
    pending = [c for c in changes if c.status in ("submitted", "negotiating")]

    net_budget_impact = sum(
        (c.difference_amount or 0) for c in approved
    )
    net_duration_impact = sum(
        ((c.changed_duration or 0) - (c.original_duration or 0))
        for c in approved
        if c.changed_duration is not None or c.original_duration is not None
    )

    return {
        "total_changes": total,
        "approved_count": len(approved),
        "pending_count": len(pending),
        "net_budget_impact": net_budget_impact,
        "net_duration_impact_days": net_duration_impact,
        "by_type": {
            ct: len([c for c in changes if c.change_type == ct])
            for ct in ("設計変更", "数量変更", "工期変更", "追加工事")
        },
        "by_status": {
            st: len([c for c in changes if c.status == st])
            for st in ("draft", "submitted", "negotiating", "approved", "rejected")
        },
    }


@router.get("/{change_id}")
def get_design_change(
    project_id: str,
    change_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    dc = db.query(DesignChange).filter(
        DesignChange.id == change_id,
        DesignChange.project_id == project_id,
        DesignChange.tenant_id == user.tenant_id,
    ).first()
    if not dc:
        raise HTTPException(status_code=404, detail="設計変更が見つかりません")
    return dc


@router.put("/{change_id}")
def update_design_change(
    project_id: str,
    change_id: str,
    req: DesignChangeUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    dc = db.query(DesignChange).filter(
        DesignChange.id == change_id,
        DesignChange.project_id == project_id,
        DesignChange.tenant_id == user.tenant_id,
    ).first()
    if not dc:
        raise HTTPException(status_code=404, detail="設計変更が見つかりません")

    data = req.model_dump(exclude_unset=True)

    # Auto-calculate difference when amounts updated
    new_changed = data.get("changed_amount", dc.changed_amount)
    new_original = data.get("original_amount", dc.original_amount)
    if new_changed is not None and new_original is not None:
        data["difference_amount"] = new_changed - new_original

    # Set approved_at when approving
    if data.get("status") == "approved" and dc.status != "approved":
        data["approved_at"] = datetime.now(timezone.utc)

    for k, v in data.items():
        setattr(dc, k, v)
    db.commit()
    db.refresh(dc)
    return dc


@router.delete("/{change_id}")
def delete_design_change(
    project_id: str,
    change_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    dc = db.query(DesignChange).filter(
        DesignChange.id == change_id,
        DesignChange.project_id == project_id,
        DesignChange.tenant_id == user.tenant_id,
    ).first()
    if not dc:
        raise HTTPException(status_code=404, detail="設計変更が見つかりません")
    db.delete(dc)
    db.commit()
    return {"status": "ok"}


# ---------- Status workflow ----------

@router.post("/{change_id}/submit")
def submit_design_change(
    project_id: str,
    change_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    dc = db.query(DesignChange).filter(
        DesignChange.id == change_id,
        DesignChange.project_id == project_id,
        DesignChange.tenant_id == user.tenant_id,
    ).first()
    if not dc:
        raise HTTPException(status_code=404, detail="設計変更が見つかりません")
    if dc.status != "draft":
        raise HTTPException(status_code=400, detail="下書き状態のみ提出できます")
    dc.status = "submitted"
    dc.requested_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dc)
    return dc


@router.post("/{change_id}/approve")
def approve_design_change(
    project_id: str,
    change_id: str,
    approved_by: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    dc = db.query(DesignChange).filter(
        DesignChange.id == change_id,
        DesignChange.project_id == project_id,
        DesignChange.tenant_id == user.tenant_id,
    ).first()
    if not dc:
        raise HTTPException(status_code=404, detail="設計変更が見つかりません")
    dc.status = "approved"
    dc.approved_by = approved_by or user.name
    dc.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dc)
    return dc


@router.post("/{change_id}/reject")
def reject_design_change(
    project_id: str,
    change_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    dc = db.query(DesignChange).filter(
        DesignChange.id == change_id,
        DesignChange.project_id == project_id,
        DesignChange.tenant_id == user.tenant_id,
    ).first()
    if not dc:
        raise HTTPException(status_code=404, detail="設計変更が見つかりません")
    dc.status = "rejected"
    db.commit()
    db.refresh(dc)
    return dc
