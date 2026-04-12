"""ゼネコン管理職員向け 全社横串ダッシュボード router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.work_package import WorkPackage, MonthlyProgress
from models.staffing import StaffAssignment
from models.performance_rating import ScheduleDelay
from models.user import User
from services.auth_service import get_current_user
from services.timezone_utils import today_jst

router = APIRouter(prefix="/api/company", tags=["company-dashboard"])


# ---------- Endpoints ----------

@router.get("/profit-ranking")
def profit_ranking(
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """全アクティブ案件の利益率ランキング (低い順)"""
    projects = db.query(Project).filter(
        Project.tenant_id == user.tenant_id,
        Project.status.in_(["active", "inspection"]),
    ).all()

    result = []
    for p in projects:
        contract = p.contract_amount or 0

        # Total budget from work packages
        total_budget = db.query(func.sum(WorkPackage.budget_amount)).filter(
            WorkPackage.project_id == p.id
        ).scalar() or 0

        # Total actual cost from work packages
        total_actual = db.query(func.sum(WorkPackage.actual_cost)).filter(
            WorkPackage.project_id == p.id
        ).scalar() or 0

        gross_profit = contract - int(total_actual)
        profit_rate = round(gross_profit / contract * 100, 2) if contract else 0.0

        result.append({
            "project_id": p.id,
            "name": p.name,
            "contract_amount": contract,
            "total_budget": int(total_budget),
            "total_actual": int(total_actual),
            "gross_profit": gross_profit,
            "profit_rate": profit_rate,
        })

    result.sort(key=lambda x: x["profit_rate"])
    return result


@router.get("/monthly-summary")
def monthly_summary(
    year_month: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """月別全案件サマリー"""
    projects = db.query(Project).filter(
        Project.tenant_id == user.tenant_id,
    ).all()
    project_ids = [p.id for p in projects]

    contract_total = sum((p.contract_amount or 0) for p in projects)

    # Actual costs total (from work packages)
    actual_total = db.query(func.sum(WorkPackage.actual_cost)).filter(
        WorkPackage.project_id.in_(project_ids)
    ).scalar() or 0 if project_ids else 0

    # Monthly progress amounts
    progress_total = db.query(func.sum(MonthlyProgress.progress_amount)).filter(
        MonthlyProgress.project_id.in_(project_ids),
        MonthlyProgress.year_month == year_month,
    ).scalar() or 0 if project_ids else 0

    # Per-project breakdown for this month
    project_details = []
    for p in projects:
        monthly = db.query(func.sum(MonthlyProgress.progress_amount)).filter(
            MonthlyProgress.project_id == p.id,
            MonthlyProgress.year_month == year_month,
        ).scalar() or 0
        project_details.append({
            "project_id": p.id,
            "name": p.name,
            "contract_amount": p.contract_amount or 0,
            "monthly_progress_amount": int(monthly),
        })

    return {
        "year_month": year_month,
        "total_projects": len(projects),
        "contract_amounts_total": contract_total,
        "actual_costs_total": int(actual_total),
        "cumulative_progress_amounts": int(progress_total),
        "projects": project_details,
    }


@router.get("/staff-overview")
def staff_overview(
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """案件別人員配置状況"""
    today = today_jst()

    assignments = db.query(StaffAssignment).filter(
        StaffAssignment.tenant_id == user.tenant_id,
        StaffAssignment.start_date <= today,
    ).all()
    # Active assignments (no end_date or end_date >= today)
    active = [a for a in assignments if a.end_date is None or a.end_date >= today]

    projects = db.query(Project).filter(
        Project.tenant_id == user.tenant_id,
        Project.status.in_(["active", "inspection"]),
    ).all()
    project_map = {p.id: p.name for p in projects}

    # Group by project
    by_project: dict[str, list] = {}
    assigned_project_ids = set()
    for a in active:
        assigned_project_ids.add(a.project_id)
        by_project.setdefault(a.project_id, []).append({
            "worker_name": a.worker_name,
            "role": a.role,
            "allocation_percent": a.allocation_percent,
        })

    project_staff = [
        {
            "project_id": pid,
            "project_name": project_map.get(pid, ""),
            "staff_count": len(members),
            "members": members,
        }
        for pid, members in by_project.items()
    ]
    project_staff.sort(key=lambda x: x["staff_count"], reverse=True)

    # Projects with no assignment
    unassigned_projects = [
        {"project_id": p.id, "name": p.name}
        for p in projects
        if p.id not in assigned_project_ids
    ]

    return {
        "total_staff": len(active),
        "projects_with_staff": len(by_project),
        "project_staff": project_staff,
        "unassigned_projects": unassigned_projects,
    }


@router.get("/delay-overview")
def delay_overview(
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """工期遅延概況"""
    projects = db.query(Project).filter(
        Project.tenant_id == user.tenant_id,
        Project.status.in_(["active", "inspection"]),
    ).all()
    project_ids = [p.id for p in projects]
    project_map = {p.id: p.name for p in projects}

    if not project_ids:
        return []

    delays = db.query(ScheduleDelay).filter(
        ScheduleDelay.project_id.in_(project_ids)
    ).all()

    # Group by project
    by_project: dict[str, list] = {}
    for d in delays:
        by_project.setdefault(d.project_id, []).append(d)

    result = []
    for pid, project_delays in by_project.items():
        total_days = sum(d.delay_days for d in project_delays)
        causes: dict[str, int] = {}
        for d in project_delays:
            causes[d.delay_cause] = causes.get(d.delay_cause, 0) + d.delay_days

        result.append({
            "project_id": pid,
            "project_name": project_map.get(pid, ""),
            "total_delay_days": total_days,
            "causes_breakdown": causes,
        })

    result.sort(key=lambda x: x["total_delay_days"], reverse=True)
    return result
