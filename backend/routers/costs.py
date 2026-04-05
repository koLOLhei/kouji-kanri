"""Cost management (原価管理) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.cost import CostBudget, CostActual, CostForecast
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/costs", tags=["costs"])


# ---------- Schemas ----------

class BudgetCreate(BaseModel):
    category: str
    subcategory: str | None = None
    budgeted_amount: int = 0
    description: str | None = None


class BudgetUpdate(BaseModel):
    category: str | None = None
    subcategory: str | None = None
    budgeted_amount: int | None = None
    description: str | None = None


class ActualCreate(BaseModel):
    category: str
    subcategory: str | None = None
    amount: int
    expense_date: date | None = None
    vendor_name: str | None = None
    description: str | None = None
    receipt_file_key: str | None = None


class ActualUpdate(BaseModel):
    category: str | None = None
    subcategory: str | None = None
    amount: int | None = None
    expense_date: date | None = None
    vendor_name: str | None = None
    description: str | None = None
    receipt_file_key: str | None = None


class ForecastCreate(BaseModel):
    forecast_date: date
    total_budget: int = 0
    total_spent: int = 0
    estimated_total: int = 0
    variance: int = 0
    notes: str | None = None


class ForecastUpdate(BaseModel):
    total_budget: int | None = None
    total_spent: int | None = None
    estimated_total: int | None = None
    variance: int | None = None
    notes: str | None = None


# ---------- Budget ----------

@router.get("/budgets")
def list_budgets(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return db.query(CostBudget).filter(CostBudget.project_id == project_id).order_by(CostBudget.category).all()


@router.post("/budgets")
def create_budget(
    project_id: str, req: BudgetCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    b = CostBudget(project_id=project_id, **req.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.put("/budgets/{budget_id}")
def update_budget(
    project_id: str, budget_id: str, req: BudgetUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    b = db.query(CostBudget).filter(CostBudget.id == budget_id, CostBudget.project_id == project_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="予算が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return b


@router.delete("/budgets/{budget_id}")
def delete_budget(
    project_id: str, budget_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    b = db.query(CostBudget).filter(CostBudget.id == budget_id, CostBudget.project_id == project_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="予算が見つかりません")
    db.delete(b)
    db.commit()
    return {"status": "ok"}


# ---------- Actuals ----------

@router.get("/actuals")
def list_actuals(
    project_id: str,
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    q = db.query(CostActual).filter(CostActual.project_id == project_id)
    if category:
        q = q.filter(CostActual.category == category)
    if date_from:
        q = q.filter(CostActual.expense_date >= date_from)
    if date_to:
        q = q.filter(CostActual.expense_date <= date_to)
    return q.order_by(CostActual.created_at.desc()).all()


@router.post("/actuals")
def create_actual(
    project_id: str, req: ActualCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    a = CostActual(project_id=project_id, recorded_by=user.id, **req.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/actuals/{actual_id}")
def update_actual(
    project_id: str, actual_id: str, req: ActualUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    a = db.query(CostActual).filter(CostActual.id == actual_id, CostActual.project_id == project_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="実績が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/actuals/{actual_id}")
def delete_actual(
    project_id: str, actual_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    a = db.query(CostActual).filter(CostActual.id == actual_id, CostActual.project_id == project_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="実績が見つかりません")
    db.delete(a)
    db.commit()
    return {"status": "ok"}


# ---------- Forecasts ----------

@router.get("/forecasts")
def list_forecasts(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return db.query(CostForecast).filter(
        CostForecast.project_id == project_id
    ).order_by(CostForecast.forecast_date.desc()).all()


@router.post("/forecasts")
def create_forecast(
    project_id: str, req: ForecastCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    f = CostForecast(project_id=project_id, created_by=user.id, **req.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@router.put("/forecasts/{forecast_id}")
def update_forecast(
    project_id: str, forecast_id: str, req: ForecastUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    f = db.query(CostForecast).filter(CostForecast.id == forecast_id, CostForecast.project_id == project_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="予測が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(f, k, v)
    db.commit()
    db.refresh(f)
    return f


@router.delete("/forecasts/{forecast_id}")
def delete_forecast(
    project_id: str, forecast_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    f = db.query(CostForecast).filter(CostForecast.id == forecast_id, CostForecast.project_id == project_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="予測が見つかりません")
    db.delete(f)
    db.commit()
    return {"status": "ok"}


# ---------- Cost Summary (予実対比) ----------

@router.get("/cost-summary")
def cost_summary(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """予実対比 - Budget vs Actual comparison by category."""
    budgets = db.query(
        CostBudget.category,
        func.sum(CostBudget.budgeted_amount).label("budget"),
    ).filter(CostBudget.project_id == project_id).group_by(CostBudget.category).all()

    actuals = db.query(
        CostActual.category,
        func.sum(CostActual.amount).label("actual"),
    ).filter(CostActual.project_id == project_id).group_by(CostActual.category).all()

    budget_map = {b.category: int(b.budget or 0) for b in budgets}
    actual_map = {a.category: int(a.actual or 0) for a in actuals}
    categories = sorted(set(budget_map.keys()) | set(actual_map.keys()))

    total_budget = 0
    total_actual = 0
    rows = []
    for cat in categories:
        b = budget_map.get(cat, 0)
        a = actual_map.get(cat, 0)
        total_budget += b
        total_actual += a
        rows.append({
            "category": cat,
            "budget": b,
            "actual": a,
            "variance": b - a,
            "rate": round(a / b * 100, 1) if b else 0,
        })

    return {
        "items": rows,
        "total_budget": total_budget,
        "total_actual": total_actual,
        "total_variance": total_budget - total_actual,
        "total_rate": round(total_actual / total_budget * 100, 1) if total_budget else 0,
    }
