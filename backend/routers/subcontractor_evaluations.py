"""Subcontractor Evaluation (協力業者評価) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.subcontractor_evaluation import SubcontractorEvaluation
from models.subcontractor import Subcontractor
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/subcontractors/{sub_id}/evaluations", tags=["subcontractor-evaluations"])


# ---------- Schemas ----------

class EvaluationCreate(BaseModel):
    project_id: str
    evaluation_period_start: date | None = None
    evaluation_period_end: date | None = None
    safety_score: int | None = None      # 1-5
    quality_score: int | None = None     # 1-5
    schedule_score: int | None = None    # 1-5
    cooperation_score: int | None = None # 1-5
    comments: str | None = None
    evaluated_by: str | None = None

    def compute_overall(self) -> float | None:
        scores = [s for s in [
            self.safety_score, self.quality_score,
            self.schedule_score, self.cooperation_score
        ] if s is not None]
        if not scores:
            return None
        return round(sum(scores) / len(scores), 2)


class EvaluationUpdate(BaseModel):
    evaluation_period_start: date | None = None
    evaluation_period_end: date | None = None
    safety_score: int | None = None
    quality_score: int | None = None
    schedule_score: int | None = None
    cooperation_score: int | None = None
    comments: str | None = None
    evaluated_by: str | None = None


# ---------- Helper ----------

def _get_subcontractor(sub_id: str, tenant_id: str, db: Session) -> Subcontractor:
    sub = db.query(Subcontractor).filter(
        Subcontractor.id == sub_id,
        Subcontractor.tenant_id == tenant_id,
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="協力業者が見つかりません")
    return sub


# ---------- Endpoints ----------

@router.get("")
def list_evaluations(
    sub_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_subcontractor(sub_id, user.tenant_id, db)
    return db.query(SubcontractorEvaluation).filter(
        SubcontractorEvaluation.subcontractor_id == sub_id,
        SubcontractorEvaluation.tenant_id == user.tenant_id,
    ).order_by(SubcontractorEvaluation.created_at.desc()).all()


@router.post("")
def create_evaluation(
    sub_id: str,
    req: EvaluationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_subcontractor(sub_id, user.tenant_id, db)

    # Validate scores range 1-5
    for score_field in ("safety_score", "quality_score", "schedule_score", "cooperation_score"):
        val = getattr(req, score_field)
        if val is not None and not (1 <= val <= 5):
            raise HTTPException(status_code=400, detail=f"{score_field}は1〜5で入力してください")

    overall = req.compute_overall()
    data = req.model_dump()
    ev = SubcontractorEvaluation(
        subcontractor_id=sub_id,
        tenant_id=user.tenant_id,
        overall_score=overall,
        **data,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.get("/average")
def evaluation_average(
    sub_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """協力業者の評価平均スコア"""
    _get_subcontractor(sub_id, user.tenant_id, db)

    rows = db.query(SubcontractorEvaluation).filter(
        SubcontractorEvaluation.subcontractor_id == sub_id,
        SubcontractorEvaluation.tenant_id == user.tenant_id,
    ).all()

    def avg(vals: list) -> float | None:
        vals = [v for v in vals if v is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    return {
        "evaluation_count": len(rows),
        "safety_avg": avg([r.safety_score for r in rows]),
        "quality_avg": avg([r.quality_score for r in rows]),
        "schedule_avg": avg([r.schedule_score for r in rows]),
        "cooperation_avg": avg([r.cooperation_score for r in rows]),
        "overall_avg": avg([r.overall_score for r in rows]),
    }


@router.get("/{eval_id}")
def get_evaluation(
    sub_id: str,
    eval_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ev = db.query(SubcontractorEvaluation).filter(
        SubcontractorEvaluation.id == eval_id,
        SubcontractorEvaluation.subcontractor_id == sub_id,
        SubcontractorEvaluation.tenant_id == user.tenant_id,
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="評価が見つかりません")
    return ev


@router.put("/{eval_id}")
def update_evaluation(
    sub_id: str,
    eval_id: str,
    req: EvaluationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ev = db.query(SubcontractorEvaluation).filter(
        SubcontractorEvaluation.id == eval_id,
        SubcontractorEvaluation.subcontractor_id == sub_id,
        SubcontractorEvaluation.tenant_id == user.tenant_id,
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="評価が見つかりません")

    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(ev, k, v)

    # Recalculate overall
    scores = [
        ev.safety_score, ev.quality_score,
        ev.schedule_score, ev.cooperation_score,
    ]
    valid_scores = [s for s in scores if s is not None]
    ev.overall_score = round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None

    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/{eval_id}")
def delete_evaluation(
    sub_id: str,
    eval_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ev = db.query(SubcontractorEvaluation).filter(
        SubcontractorEvaluation.id == eval_id,
        SubcontractorEvaluation.subcontractor_id == sub_id,
        SubcontractorEvaluation.tenant_id == user.tenant_id,
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="評価が見つかりません")
    db.delete(ev)
    db.commit()
    return {"status": "ok"}
