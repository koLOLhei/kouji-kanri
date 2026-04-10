"""VE提案・技術提案管理 router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.instruction import VEProposal
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/ve-proposals", tags=["ve-proposals"])


# ---------- Schemas ----------

class VEProposalCreate(BaseModel):
    title: str
    proposal_type: str
    description: str | None = None
    expected_benefit: str | None = None
    cost_reduction: int | None = None
    schedule_impact_days: int | None = None
    netis_number: str | None = None
    notes: str | None = None


class VEProposalUpdate(BaseModel):
    title: str | None = None
    proposal_type: str | None = None
    description: str | None = None
    expected_benefit: str | None = None
    cost_reduction: int | None = None
    schedule_impact_days: int | None = None
    status: str | None = None
    submitted_date: date | None = None
    approved_date: date | None = None
    implementation_status: str | None = None
    netis_number: str | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_ve_proposals(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    return (
        db.query(VEProposal)
        .filter(VEProposal.project_id == project_id)
        .order_by(VEProposal.created_at.desc())
        .all()
    )


@router.post("", status_code=201)
def create_ve_proposal(
    project_id: str,
    body: VEProposalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    # Auto-number
    verify_project_access(project_id, user, db)
    count = db.query(func.count(VEProposal.id)).filter(
        VEProposal.project_id == project_id,
    ).scalar() or 0

    type_prefix_map = {
        "ve": "VE",
        "technical": "技術",
        "improvement": "改善",
    }
    prefix = type_prefix_map.get(body.proposal_type, body.proposal_type)
    proposal_number = f"{prefix}-{count + 1:04d}"

    record = VEProposal(
        project_id=project_id,
        proposal_number=proposal_number,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/summary")
def ve_proposal_summary(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    rows = db.query(VEProposal).filter(VEProposal.project_id == project_id).all()

    by_status: dict[str, int] = {}
    total_cost_reduction = 0

    for r in rows:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        total_cost_reduction += r.cost_reduction or 0

    return {
        "total_count": len(rows),
        "counts_by_status": by_status,
        "total_cost_reduction": total_cost_reduction,
    }


@router.get("/{proposal_id}")
def get_ve_proposal(
    project_id: str,
    proposal_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(VEProposal).filter(
        VEProposal.id == proposal_id,
        VEProposal.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="VE提案が見つかりません")
    return record


@router.put("/{proposal_id}")
def update_ve_proposal(
    project_id: str,
    proposal_id: str,
    body: VEProposalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(VEProposal).filter(
        VEProposal.id == proposal_id,
        VEProposal.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="VE提案が見つかりません")

    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    db.commit()
    db.refresh(record)
    return record
