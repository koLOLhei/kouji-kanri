"""工事成績評定・キャッシュフロー・工期遅延分析 router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.performance_rating import PerformanceRating, CashFlow, ScheduleDelay
from models.phase import Phase
from models.corrective_action import CorrectiveAction
from models.safety import IncidentReport
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/performance", tags=["performance"])


# ---------- Schemas ----------

class PerformanceRatingCreate(BaseModel):
    evaluation_date: date
    construction_system_score: int = 16
    construction_system_notes: str | None = None
    schedule_management: int = 6
    safety_management: int = 6
    worker_management: int = 3
    quality_score: int = 20
    as_built_accuracy: int = 5
    technical_proposal: int = 0
    social_contribution: int = 0
    notes: str | None = None


class CashFlowCreate(BaseModel):
    year_month: str
    progress_payment_received: int = 0
    other_income: int = 0
    material_payment: int = 0
    subcontractor_payment: int = 0
    labor_cost: int = 0
    equipment_cost: int = 0
    overhead: int = 0
    other_expense: int = 0
    notes: str | None = None


class ScheduleDelayCreate(BaseModel):
    delay_days: int
    delay_cause: str
    description: str | None = None
    impact_on_completion: bool = False
    mitigation: str | None = None
    phase_id: str | None = None
    recorded_date: date


# ---------- Performance Rating ----------

def _calc_grade(total_score: float) -> str:
    if total_score >= 80:
        return "A"
    elif total_score >= 70:
        return "B"
    elif total_score >= 60:
        return "C"
    return "D"


@router.get("/rating")
def get_latest_rating(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    rating = db.query(PerformanceRating).filter(
        PerformanceRating.project_id == project_id
    ).order_by(PerformanceRating.evaluation_date.desc()).first()
    if not rating:
        raise HTTPException(status_code=404, detail="評定が見つかりません")
    return rating


@router.post("/rating")
def create_rating(
    project_id: str, req: PerformanceRatingCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    data = req.model_dump()
    total_score = (
        data["construction_system_score"]
        + data["schedule_management"]
        + data["safety_management"]
        + data["worker_management"]
        + data["quality_score"]
        + data["as_built_accuracy"]
        + data["technical_proposal"]
        + data["social_contribution"]
    )
    data["total_score"] = total_score
    data["grade"] = _calc_grade(total_score)

    rating = PerformanceRating(
        project_id=project_id,
        evaluated_by=user.id,
        **data,
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


@router.get("/rating/simulate")
def simulate_rating(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """現在のプロジェクトデータから評定をシミュレーション"""
    # Phases progress
    phases = db.query(Phase).filter(Phase.project_id == project_id).all()
    total_phases = len(phases)
    completed_phases = sum(1 for p in phases if p.progress_percent >= 100)

    # NCR count
    ncr_count = db.query(func.count(CorrectiveAction.id)).filter(
        CorrectiveAction.project_id == project_id,
    ).scalar() or 0
    open_ncr = db.query(func.count(CorrectiveAction.id)).filter(
        CorrectiveAction.project_id == project_id,
        CorrectiveAction.status.in_(["open", "in_progress"]),
    ).scalar() or 0

    # Safety incidents
    incident_count = db.query(func.count(IncidentReport.id)).filter(
        IncidentReport.project_id == project_id,
    ).scalar() or 0

    # Suggest scores based on data
    # Schedule: full score if on track
    schedule_score = 8 if total_phases > 0 and completed_phases / total_phases >= 0.8 else 6
    # Safety: deduct for incidents
    safety_score = max(4, 8 - incident_count)
    # Quality: deduct for open NCRs
    quality_score = max(15, 25 - open_ncr * 2)

    suggested = {
        "construction_system_score": 16,
        "schedule_management": schedule_score,
        "safety_management": safety_score,
        "worker_management": 3,
        "quality_score": quality_score,
        "as_built_accuracy": 5,
        "technical_proposal": 0,
        "social_contribution": 0,
    }
    total = sum(suggested.values())
    suggested["total_score"] = total
    suggested["grade"] = _calc_grade(total)

    return {
        "data_summary": {
            "total_phases": total_phases,
            "completed_phases": completed_phases,
            "ncr_count": int(ncr_count),
            "open_ncr": int(open_ncr),
            "incident_count": int(incident_count),
        },
        "suggested_scores": suggested,
    }


# ---------- Cash Flow ----------

@router.get("/cash-flow")
def list_cash_flow(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(CashFlow).filter(
        CashFlow.project_id == project_id
    ).order_by(CashFlow.year_month).all()


@router.post("/cash-flow")
def create_cash_flow(
    project_id: str, req: CashFlowCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    data = req.model_dump()
    total_income = data["progress_payment_received"] + data["other_income"]
    total_expense = (
        data["material_payment"]
        + data["subcontractor_payment"]
        + data["labor_cost"]
        + data["equipment_cost"]
        + data["overhead"]
        + data["other_expense"]
    )
    data["net_cash_flow"] = total_income - total_expense

    # Calculate cumulative from previous entries
    prev = db.query(CashFlow).filter(
        CashFlow.project_id == project_id,
        CashFlow.year_month < data["year_month"],
    ).order_by(CashFlow.year_month.desc()).first()
    prev_cumulative = prev.cumulative_cash_flow if prev else 0
    data["cumulative_cash_flow"] = prev_cumulative + data["net_cash_flow"]

    cf = CashFlow(project_id=project_id, **data)
    db.add(cf)
    db.commit()
    db.refresh(cf)
    return cf


@router.get("/cash-flow/chart")
def cash_flow_chart(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    entries = db.query(CashFlow).filter(
        CashFlow.project_id == project_id
    ).order_by(CashFlow.year_month).all()

    return [
        {
            "year_month": e.year_month,
            "income": e.progress_payment_received + e.other_income,
            "expense": (
                e.material_payment + e.subcontractor_payment
                + e.labor_cost + e.equipment_cost
                + e.overhead + e.other_expense
            ),
            "net": e.net_cash_flow,
            "cumulative": e.cumulative_cash_flow,
        }
        for e in entries
    ]


# ---------- Schedule Delays ----------

@router.get("/delays")
def list_delays(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(ScheduleDelay).filter(
        ScheduleDelay.project_id == project_id
    ).order_by(ScheduleDelay.recorded_date.desc()).all()


@router.post("/delays")
def create_delay(
    project_id: str, req: ScheduleDelayCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    d = ScheduleDelay(
        project_id=project_id,
        recorded_by=user.id,
        **req.model_dump(),
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.get("/delays/analysis")
def delay_analysis(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """原因別遅延分析"""
    delays = db.query(ScheduleDelay).filter(
        ScheduleDelay.project_id == project_id
    ).all()

    by_cause: dict[str, int] = {}
    total_days = 0
    for d in delays:
        by_cause[d.delay_cause] = by_cause.get(d.delay_cause, 0) + d.delay_days
        total_days += d.delay_days

    percentage_by_cause = {
        cause: round(days / total_days * 100, 1) if total_days else 0
        for cause, days in by_cause.items()
    }

    return {
        "total_delay_days": total_days,
        "by_cause": by_cause,
        "percentage_by_cause": percentage_by_cause,
    }
