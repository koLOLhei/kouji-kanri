"""Multi-level approval workflow router."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.approval import ApprovalFlow, ApprovalStep
from models.user import User
from services.auth_service import get_current_user
from services.permissions import Permission, require_permission

router = APIRouter(prefix="/api/approval-workflows", tags=["approval-workflow"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class StepDefinition(BaseModel):
    step_order: int
    step_name: str
    approver_role: Optional[str] = None
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    is_required: bool = True
    due_date: Optional[datetime] = None
    conditions: Optional[dict] = None


class FlowCreate(BaseModel):
    entity_type: str
    entity_id: str
    title: str
    description: Optional[str] = None
    steps: list[StepDefinition]
    metadata_json: dict = {}


class StepActionRequest(BaseModel):
    action: str  # approve, reject, return, conditionally_approve
    comment: Optional[str] = None
    conditions: Optional[dict] = None  # for conditional_approve


class FlowStepResponse(BaseModel):
    id: str
    flow_id: str
    step_order: int
    step_name: str
    approver_role: Optional[str]
    approver_id: Optional[str]
    approver_name: Optional[str]
    status: str
    comment: Optional[str]
    conditions: Optional[dict]
    is_required: bool
    acted_by: Optional[str]
    acted_at: Optional[datetime]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FlowResponse(BaseModel):
    id: str
    tenant_id: str
    entity_type: str
    entity_id: str
    title: str
    description: Optional[str]
    status: str
    current_step: int
    total_steps: int
    created_by: str
    completed_at: Optional[datetime]
    metadata_json: dict
    created_at: datetime
    updated_at: datetime
    steps: list[FlowStepResponse] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_STEP_ACTION_STATUS = {
    "approve": "approved",
    "reject": "rejected",
    "return": "returned",
    "conditionally_approve": "conditionally_approved",
}

VALID_ACTIONS = set(_STEP_ACTION_STATUS.keys())


def _get_flow(db: Session, flow_id: str, tenant_id: str) -> ApprovalFlow:
    flow = db.query(ApprovalFlow).filter(
        ApprovalFlow.id == flow_id, ApprovalFlow.tenant_id == tenant_id
    ).first()
    if not flow:
        raise HTTPException(status_code=404, detail="承認フローが見つかりません")
    return flow


def _user_can_act_on_step(user: User, step: ApprovalStep) -> bool:
    """Check if a user is allowed to take action on a specific step."""
    if user.role in ("super_admin", "admin"):
        return True
    if step.approver_id and step.approver_id == user.id:
        return True
    if step.approver_role and step.approver_role == user.role:
        return True
    return False


def _advance_flow(db: Session, flow: ApprovalFlow) -> None:
    """After approving a step, advance the flow to the next pending step or mark it complete."""
    steps = (
        db.query(ApprovalStep)
        .filter(ApprovalStep.flow_id == flow.id)
        .order_by(ApprovalStep.step_order)
        .all()
    )

    # Find the next pending required step
    next_step = next(
        (s for s in steps if s.status == "pending" and s.is_required), None
    )

    if next_step:
        flow.current_step = next_step.step_order
        flow.status = "in_progress"
    else:
        # Check if any required step is rejected or returned
        rejected = next((s for s in steps if s.status in ("rejected", "returned") and s.is_required), None)
        if rejected:
            flow.status = rejected.status
            flow.completed_at = datetime.now(timezone.utc)
        else:
            # All required steps approved (possibly some conditionally)
            cond = next((s for s in steps if s.status == "conditionally_approved"), None)
            flow.status = "conditionally_approved" if cond else "approved"
            flow.completed_at = datetime.now(timezone.utc)

    db.commit()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=FlowResponse)
def create_flow(
    req: FlowCreate,
    user: User = Depends(require_permission(Permission.CREATE)),
    db: Session = Depends(get_db),
):
    """承認フローを作成する"""
    if not req.steps:
        raise HTTPException(status_code=400, detail="ステップを1つ以上指定してください")

    flow = ApprovalFlow(
        tenant_id=user.tenant_id,
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        title=req.title,
        description=req.description,
        status="pending",
        current_step=1,
        total_steps=len(req.steps),
        created_by=user.id,
        metadata_json=req.metadata_json,
    )
    db.add(flow)
    db.flush()

    for step_def in req.steps:
        step = ApprovalStep(
            flow_id=flow.id,
            step_order=step_def.step_order,
            step_name=step_def.step_name,
            approver_role=step_def.approver_role,
            approver_id=step_def.approver_id,
            approver_name=step_def.approver_name,
            is_required=step_def.is_required,
            due_date=step_def.due_date,
            conditions=step_def.conditions,
            status="pending",
        )
        db.add(step)

    db.commit()
    db.refresh(flow)

    steps = db.query(ApprovalStep).filter(ApprovalStep.flow_id == flow.id).order_by(ApprovalStep.step_order).all()
    resp = FlowResponse.model_validate(flow)
    resp.steps = [FlowStepResponse.model_validate(s) for s in steps]
    return resp


@router.get("", response_model=list[FlowResponse])
def list_flows(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """承認フロー一覧"""
    q = db.query(ApprovalFlow).filter(ApprovalFlow.tenant_id == user.tenant_id)
    if entity_type:
        q = q.filter(ApprovalFlow.entity_type == entity_type)
    if entity_id:
        q = q.filter(ApprovalFlow.entity_id == entity_id)
    if status:
        q = q.filter(ApprovalFlow.status == status)
    flows = q.order_by(ApprovalFlow.created_at.desc()).all()

    result = []
    for flow in flows:
        steps = db.query(ApprovalStep).filter(ApprovalStep.flow_id == flow.id).order_by(ApprovalStep.step_order).all()
        resp = FlowResponse.model_validate(flow)
        resp.steps = [FlowStepResponse.model_validate(s) for s in steps]
        result.append(resp)
    return result


@router.get("/{flow_id}", response_model=FlowResponse)
def get_flow(
    flow_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """承認フロー詳細"""
    flow = _get_flow(db, flow_id, user.tenant_id)
    steps = db.query(ApprovalStep).filter(ApprovalStep.flow_id == flow.id).order_by(ApprovalStep.step_order).all()
    resp = FlowResponse.model_validate(flow)
    resp.steps = [FlowStepResponse.model_validate(s) for s in steps]
    return resp


@router.post("/{flow_id}/steps/{step_id}/action", response_model=FlowResponse)
def act_on_step(
    flow_id: str,
    step_id: str,
    req: StepActionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """承認ステップに対してアクション（承認/却下/差し戻し/条件付承認）を実行する"""
    if req.action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail=f"無効なアクション: {req.action}. 有効: {sorted(VALID_ACTIONS)}")

    flow = _get_flow(db, flow_id, user.tenant_id)

    if flow.status in ("approved", "rejected", "returned"):
        raise HTTPException(status_code=400, detail=f"フローは既に '{flow.status}' 状態です")

    step = db.query(ApprovalStep).filter(
        ApprovalStep.id == step_id,
        ApprovalStep.flow_id == flow_id,
    ).first()
    if not step:
        raise HTTPException(status_code=404, detail="ステップが見つかりません")

    if step.status != "pending":
        raise HTTPException(status_code=400, detail=f"ステップは既に '{step.status}' 状態です")

    # 順番チェック: 前の必須ステップが全て完了しているか確認
    prior_steps = db.query(ApprovalStep).filter(
        ApprovalStep.flow_id == flow_id,
        ApprovalStep.step_order < step.step_order,
        ApprovalStep.is_required == True,
    ).all()
    incomplete = [s for s in prior_steps if s.status not in ("approved", "conditionally_approved")]
    if incomplete:
        names = ", ".join(s.step_name for s in incomplete)
        raise HTTPException(status_code=400, detail=f"前のステップが未完了です: {names}")

    if not _user_can_act_on_step(user, step):
        raise HTTPException(status_code=403, detail="このステップを承認する権限がありません")

    # Apply action
    step.status = _STEP_ACTION_STATUS[req.action]
    step.comment = req.comment
    step.conditions = req.conditions if req.action == "conditionally_approve" else step.conditions
    step.acted_by = user.id
    step.acted_at = datetime.now(timezone.utc)
    db.commit()

    # Update flow status
    if step.status in ("rejected", "returned") and step.is_required:
        flow.status = step.status
        flow.completed_at = datetime.now(timezone.utc)
        db.commit()
    else:
        _advance_flow(db, flow)

    # 承認アクション通知: 次のステップの承認者にメール通知
    try:
        from services.email_service import send_approval_notification
        action_labels = {"approved": "承認", "rejected": "却下", "returned": "差し戻し", "conditionally_approved": "条件付承認"}
        # 次の承認者に通知
        next_steps = db.query(ApprovalStep).filter(
            ApprovalStep.flow_id == flow.id,
            ApprovalStep.status == "pending",
        ).order_by(ApprovalStep.step_order).all()
        if next_steps and next_steps[0].approver_id:
            next_approver = db.query(User).filter(User.id == next_steps[0].approver_id).first()
            if next_approver and next_approver.email:
                send_approval_notification(
                    next_approver.email,
                    flow.entity_type,
                    f"{flow.title} - {next_steps[0].step_name}",
                    "pending",
                )
        # フロー作成者にアクション結果を通知
        if flow.created_by:
            creator = db.query(User).filter(User.id == flow.created_by).first()
            if creator and creator.email:
                send_approval_notification(
                    creator.email,
                    flow.entity_type,
                    f"{flow.title} - {step.step_name}",
                    req.action,
                )
    except Exception:
        pass  # 通知失敗しても承認処理は完了させる

    db.refresh(flow)
    steps = db.query(ApprovalStep).filter(ApprovalStep.flow_id == flow.id).order_by(ApprovalStep.step_order).all()
    resp = FlowResponse.model_validate(flow)
    resp.steps = [FlowStepResponse.model_validate(s) for s in steps]
    return resp


@router.get("/{flow_id}/status")
def get_flow_status(
    flow_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """承認フローのステータスサマリー"""
    flow = _get_flow(db, flow_id, user.tenant_id)
    steps = db.query(ApprovalStep).filter(ApprovalStep.flow_id == flow.id).order_by(ApprovalStep.step_order).all()

    pending_steps = [s for s in steps if s.status == "pending"]
    approved_steps = [s for s in steps if s.status in ("approved", "conditionally_approved")]
    rejected_steps = [s for s in steps if s.status in ("rejected", "returned")]

    return {
        "flow_id": flow.id,
        "status": flow.status,
        "current_step": flow.current_step,
        "total_steps": flow.total_steps,
        "pending_count": len(pending_steps),
        "approved_count": len(approved_steps),
        "rejected_count": len(rejected_steps),
        "completed_at": flow.completed_at.isoformat() if flow.completed_at else None,
        "next_approver_role": pending_steps[0].approver_role if pending_steps else None,
        "next_approver_id": pending_steps[0].approver_id if pending_steps else None,
    }


@router.get("/{flow_id}/history")
def get_flow_history(
    flow_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """承認フローの全アクション履歴を時系列で返す。監査証跡として使用。"""
    flow = _get_flow(db, flow_id, user.tenant_id)
    steps = db.query(ApprovalStep).filter(
        ApprovalStep.flow_id == flow.id
    ).order_by(ApprovalStep.step_order).all()

    history = []
    for s in steps:
        if s.acted_at:
            actor = db.query(User).filter(User.id == s.acted_by).first() if s.acted_by else None
            history.append({
                "step_order": s.step_order,
                "step_name": s.step_name,
                "action": s.status,
                "acted_by": s.acted_by,
                "actor_name": actor.display_name if actor and hasattr(actor, 'display_name') else (actor.email if actor else None),
                "acted_at": s.acted_at.isoformat(),
                "comment": s.comment,
                "conditions": s.conditions,
            })

    return {
        "flow_id": flow.id,
        "title": flow.title,
        "entity_type": flow.entity_type,
        "entity_id": flow.entity_id,
        "final_status": flow.status,
        "created_at": flow.created_at.isoformat() if flow.created_at else None,
        "completed_at": flow.completed_at.isoformat() if flow.completed_at else None,
        "history": history,
    }


@router.delete("/{flow_id}")
def cancel_flow(
    flow_id: str,
    user: User = Depends(require_permission(Permission.EDIT)),
    db: Session = Depends(get_db),
):
    """承認フローをキャンセルする"""
    flow = _get_flow(db, flow_id, user.tenant_id)
    if flow.status in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="完了済みのフローはキャンセルできません")
    flow.status = "rejected"
    flow.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "message": "承認フローをキャンセルしました"}
