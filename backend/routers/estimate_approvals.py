"""見積承認 (G14) router — 提出 / 承認 / 却下 / 履歴一覧。"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.estimate_approval import EstimateApproval
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="", tags=["estimate-approvals"])


# ---------- Schemas ----------

class ApprovalActionBody(BaseModel):
    comment: str | None = None


class SubmitApprovalBody(BaseModel):
    comment: str | None = None


# ---------- Helpers ----------

def _get_estimate_or_404(estimate_id: str, tenant_id: str, db: Session) -> Estimate:
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.tenant_id == tenant_id,
    ).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    return estimate


def _get_approval_or_404(approval_id: str, tenant_id: str, db: Session) -> EstimateApproval:
    approval = db.query(EstimateApproval).filter(
        EstimateApproval.id == approval_id,
        EstimateApproval.tenant_id == tenant_id,
    ).first()
    if not approval:
        raise HTTPException(status_code=404, detail="承認レコードが見つかりません")
    return approval


# ---------- Endpoints ----------

@router.get("/api/estimate-approvals")
def list_estimate_approvals(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """テナント内の承認待ち見積一覧。

    status='pending' の場合、approval_status='pending' の Estimate を返す。
    それ以外の status 指定時はその approval_status と一致する Estimate を返す。
    """
    q = db.query(Estimate).filter(Estimate.tenant_id == user.tenant_id)
    if status:
        q = q.filter(Estimate.approval_status == status)
    estimates = q.order_by(Estimate.updated_at.desc()).all()

    result = []
    for est in estimates:
        # 最新の承認履歴を1件添付
        latest = (
            db.query(EstimateApproval)
            .filter(
                EstimateApproval.estimate_id == est.id,
                EstimateApproval.tenant_id == user.tenant_id,
            )
            .order_by(EstimateApproval.created_at.desc())
            .first()
        )
        result.append({
            "estimate_id": est.id,
            "estimate_number": est.estimate_number,
            "project_name": est.project_name,
            "customer_name": est.customer_name,
            "total": est.total,
            "approval_status": est.approval_status,
            "approved_at": est.approved_at,
            "approved_by": est.approved_by,
            "updated_at": est.updated_at,
            "latest_history": {
                "id": latest.id,
                "action": latest.action,
                "actor_user_id": latest.actor_user_id,
                "comment": latest.comment,
                "created_at": latest.created_at,
            } if latest else None,
        })
    return result


@router.post("/api/estimates/{estimate_id}/submit-approval", status_code=201)
def submit_for_approval(
    estimate_id: str,
    body: SubmitApprovalBody | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """見積を承認申請する。approval_status='pending' に更新し、履歴 (action='submitted') を作成。"""
    estimate = _get_estimate_or_404(estimate_id, user.tenant_id, db)

    if estimate.approval_status == "pending":
        raise HTTPException(status_code=422, detail="この見積は既に承認申請中です")
    if estimate.approval_status == "approved":
        raise HTTPException(status_code=422, detail="この見積は既に承認済みです")

    estimate.approval_status = "pending"

    history = EstimateApproval(
        tenant_id=user.tenant_id,
        estimate_id=estimate.id,
        action="submitted",
        actor_user_id=user.id,
        comment=body.comment if body else None,
    )
    db.add(history)
    db.commit()
    db.refresh(estimate)
    db.refresh(history)
    return {
        "estimate_id": estimate.id,
        "approval_status": estimate.approval_status,
        "history": {
            "id": history.id,
            "action": history.action,
            "actor_user_id": history.actor_user_id,
            "comment": history.comment,
            "created_at": history.created_at,
        },
    }


@router.post("/api/estimate-approvals/{aid}/approve")
def approve_estimate(
    aid: str,
    body: ApprovalActionBody | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """承認待ち見積を承認する。approval_status='approved'、approved_at/by 記録、履歴を追加。

    aid は EstimateApproval (履歴) の id。
    """
    approval = _get_approval_or_404(aid, user.tenant_id, db)
    estimate = _get_estimate_or_404(approval.estimate_id, user.tenant_id, db)

    if estimate.approval_status != "pending":
        raise HTTPException(status_code=422, detail="承認申請中の見積のみ承認できます")

    now = datetime.now(timezone.utc)
    estimate.approval_status = "approved"
    estimate.approved_at = now
    estimate.approved_by = user.id

    history = EstimateApproval(
        tenant_id=user.tenant_id,
        estimate_id=estimate.id,
        action="approved",
        actor_user_id=user.id,
        comment=body.comment if body else None,
    )
    db.add(history)
    db.commit()
    db.refresh(estimate)
    db.refresh(history)
    return {
        "estimate_id": estimate.id,
        "approval_status": estimate.approval_status,
        "approved_at": estimate.approved_at,
        "approved_by": estimate.approved_by,
        "history": {
            "id": history.id,
            "action": history.action,
            "actor_user_id": history.actor_user_id,
            "comment": history.comment,
            "created_at": history.created_at,
        },
    }


@router.post("/api/estimate-approvals/{aid}/reject")
def reject_estimate(
    aid: str,
    body: ApprovalActionBody | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """承認待ち見積を却下する。approval_status='rejected'、履歴を追加。

    aid は EstimateApproval (履歴) の id。
    """
    approval = _get_approval_or_404(aid, user.tenant_id, db)
    estimate = _get_estimate_or_404(approval.estimate_id, user.tenant_id, db)

    if estimate.approval_status != "pending":
        raise HTTPException(status_code=422, detail="承認申請中の見積のみ却下できます")

    estimate.approval_status = "rejected"

    history = EstimateApproval(
        tenant_id=user.tenant_id,
        estimate_id=estimate.id,
        action="rejected",
        actor_user_id=user.id,
        comment=body.comment if body else None,
    )
    db.add(history)
    db.commit()
    db.refresh(estimate)
    db.refresh(history)
    return {
        "estimate_id": estimate.id,
        "approval_status": estimate.approval_status,
        "history": {
            "id": history.id,
            "action": history.action,
            "actor_user_id": history.actor_user_id,
            "comment": history.comment,
            "created_at": history.created_at,
        },
    }
