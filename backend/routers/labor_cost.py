"""出面→労務原価 — 出面(Attendance)を作業員の日当(daily_wage)で集計し、労務原価を算出・計上。

人工(man-day) = work_hours/8（無ければ1人工）。労務費 = Σ(日当 × 人工)。
'/post-to-cost' で実績原価(CostActual, category='労務費')に計上する。
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.worker import Worker, Attendance
from models.cost import CostActual
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/labor-cost", tags=["labor-cost"])


class PostToCost(BaseModel):
    period_from: date | None = None
    period_to: date | None = None


def _summary(db: Session, tenant_id: str, project_id: str, period_from: date | None, period_to: date | None):
    q = db.query(Attendance).filter(
        Attendance.project_id == project_id,
        Attendance.tenant_id == tenant_id,
    )
    if period_from:
        q = q.filter(Attendance.work_date >= period_from)
    if period_to:
        q = q.filter(Attendance.work_date <= period_to)
    atts = q.all()

    worker_ids = {a.worker_id for a in atts}
    workers = {}
    if worker_ids:
        workers = {
            w.id: w
            for w in db.query(Worker).filter(Worker.tenant_id == tenant_id, Worker.id.in_(worker_ids)).all()
        }

    per_worker: dict[str, dict] = {}
    total_cost = 0
    total_md = 0.0
    for a in atts:
        w = workers.get(a.worker_id)
        wage = int(w.daily_wage or 0) if w else 0
        # work_hours未記録(None)は1人工、明示的な0は0人工として扱う
        md = (a.work_hours / 8.0) if a.work_hours is not None else 1.0
        cost = int(wage * md)
        e = per_worker.setdefault(
            a.worker_id,
            {"worker_id": a.worker_id, "worker_name": w.name if w else "(不明)", "daily_wage": wage, "man_days": 0.0, "cost": 0},
        )
        e["man_days"] += md
        e["cost"] += cost
        total_cost += cost
        total_md += md

    rows = sorted(per_worker.values(), key=lambda r: -r["cost"])
    for r in rows:
        r["man_days"] = round(r["man_days"], 2)
    return rows, total_cost, round(total_md, 2)


@router.get("")
def labor_cost_summary(
    project_id: str,
    period_from: date | None = None,
    period_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """出面を集計した労務原価サマリー（作業員別＋合計）。"""
    verify_project_access(project_id, user, db)
    rows, total, md = _summary(db, user.tenant_id, project_id, period_from, period_to)
    return {"workers": rows, "total_cost": total, "total_man_days": md}


@router.post("/post-to-cost", status_code=201)
def post_to_cost(
    project_id: str,
    body: PostToCost,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """集計した労務費を実績原価(CostActual)に計上する。"""
    verify_project_access(project_id, user, db)
    rows, total, md = _summary(db, user.tenant_id, project_id, body.period_from, body.period_to)
    if total <= 0:
        raise HTTPException(status_code=400, detail="計上対象の労務費がありません（出面または日当が未登録）")
    # 重複計上を防ぐ: この案件の既存「出面」労務費は置き換える（再計上=最新で上書き）
    db.query(CostActual).filter(
        CostActual.project_id == project_id,
        CostActual.category == "労務費",
        CostActual.subcategory == "出面",
    ).delete(synchronize_session=False)
    desc = f"出面 {md}人工"
    if body.period_from or body.period_to:
        desc += f"（{body.period_from or ''}〜{body.period_to or ''}）"
    rec = CostActual(
        project_id=project_id,
        category="労務費",
        subcategory="出面",
        amount=total,
        expense_date=date.today(),
        description=desc,
        recorded_by=user.id,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"cost_actual_id": rec.id, "amount": total, "man_days": md}
