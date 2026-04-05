"""Cross-project dashboard (横断ダッシュボード) router."""

from datetime import datetime, date, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func, and_, extract
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.phase import Phase
from models.cost import CostBudget, CostActual
from models.safety import IncidentReport, KYActivity, SafetyPatrol, SafetyTraining
from models.submission import Submission
from models.corrective_action import CorrectiveAction
from models.worker import Attendance
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview")
def dashboard_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """全案件のサマリー（ステータス別件数・予算対実績・進捗）"""
    projects = db.query(Project).filter(Project.tenant_id == user.tenant_id).all()
    project_ids = [p.id for p in projects]

    # Status counts
    status_counts: dict[str, int] = defaultdict(int)
    for p in projects:
        status_counts[p.status] += 1

    # Budget totals
    total_budget = db.query(func.sum(CostBudget.budgeted_amount)).filter(
        CostBudget.project_id.in_(project_ids)
    ).scalar() or 0

    total_actual = db.query(func.sum(CostActual.amount)).filter(
        CostActual.project_id.in_(project_ids)
    ).scalar() or 0

    # Also include contract_amount as budget fallback
    contract_total = sum((p.contract_amount or 0) for p in projects)

    # Average progress
    phases = db.query(Phase).filter(Phase.project_id.in_(project_ids)).all() if project_ids else []
    avg_progress = 0.0
    if phases:
        avg_progress = round(sum(ph.progress_percent for ph in phases) / len(phases), 1)

    # Overdue projects (end_date < today, not completed)
    today = date.today()
    overdue_projects = [
        p for p in projects
        if p.end_date and p.end_date < today and p.status not in ("completed",)
    ]

    # Pending corrective actions
    pending_ncr = db.query(func.count(CorrectiveAction.id)).filter(
        CorrectiveAction.project_id.in_(project_ids),
        CorrectiveAction.status.in_(["open", "in_progress"]),
    ).scalar() or 0 if project_ids else 0

    return {
        "total_projects": len(projects),
        "status_counts": dict(status_counts),
        "total_budget": int(total_budget) if total_budget else int(contract_total),
        "total_actual": int(total_actual),
        "budget_utilization_rate": round(total_actual / total_budget * 100, 1) if total_budget else 0,
        "average_progress": avg_progress,
        "overdue_project_count": len(overdue_projects),
        "pending_ncr_count": int(pending_ncr),
        "projects_by_status": dict(status_counts),
    }


@router.get("/projects-comparison")
def projects_comparison(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクト横断比較（進捗・コスト・安全・書類）"""
    projects = db.query(Project).filter(Project.tenant_id == user.tenant_id).all()
    project_ids = [p.id for p in projects]

    # Budgets per project
    budgets_by_project = dict(
        db.query(CostBudget.project_id, func.sum(CostBudget.budgeted_amount))
        .filter(CostBudget.project_id.in_(project_ids))
        .group_by(CostBudget.project_id)
        .all()
    ) if project_ids else {}

    actuals_by_project = dict(
        db.query(CostActual.project_id, func.sum(CostActual.amount))
        .filter(CostActual.project_id.in_(project_ids))
        .group_by(CostActual.project_id)
        .all()
    ) if project_ids else {}

    # Incidents per project
    incidents_by_project = dict(
        db.query(IncidentReport.project_id, func.count(IncidentReport.id))
        .filter(IncidentReport.project_id.in_(project_ids))
        .group_by(IncidentReport.project_id)
        .all()
    ) if project_ids else {}

    # Submissions per project
    submissions_by_project = dict(
        db.query(Submission.project_id, func.count(Submission.id))
        .filter(Submission.project_id.in_(project_ids))
        .group_by(Submission.project_id)
        .all()
    ) if project_ids else {}

    approved_submissions_by_project = dict(
        db.query(Submission.project_id, func.count(Submission.id))
        .filter(
            Submission.project_id.in_(project_ids),
            Submission.status == "approved",
        )
        .group_by(Submission.project_id)
        .all()
    ) if project_ids else {}

    # Phase progress per project
    phases_by_project: dict[str, list] = defaultdict(list)
    for ph in db.query(Phase).filter(Phase.project_id.in_(project_ids)).all():
        phases_by_project[ph.project_id].append(ph.progress_percent)

    result = []
    for p in projects:
        budget = int(budgets_by_project.get(p.id) or p.contract_amount or 0)
        actual = int(actuals_by_project.get(p.id) or 0)
        total_subs = int(submissions_by_project.get(p.id, 0))
        approved_subs = int(approved_submissions_by_project.get(p.id, 0))
        phase_progresses = phases_by_project.get(p.id, [])
        avg_phase_progress = round(sum(phase_progresses) / len(phase_progresses), 1) if phase_progresses else 0

        result.append({
            "project_id": p.id,
            "project_name": p.name,
            "project_code": p.project_code,
            "status": p.status,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "budget": budget,
            "actual_cost": actual,
            "cost_rate": round(actual / budget * 100, 1) if budget else 0,
            "progress": avg_phase_progress,
            "incident_count": int(incidents_by_project.get(p.id, 0)),
            "document_count": total_subs,
            "document_approved": approved_subs,
            "document_completion_rate": round(approved_subs / total_subs * 100, 1) if total_subs else 0,
        })

    result.sort(key=lambda x: x["project_name"])
    return result


@router.get("/trends")
def dashboard_trends(
    months: int = 6,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """月次トレンド（コスト・安全インシデント・書類完了率・作業員数）"""
    projects = db.query(Project).filter(Project.tenant_id == user.tenant_id).all()
    project_ids = [p.id for p in projects]

    today = date.today()
    month_labels = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        month_labels.append((y, m))

    result = []
    for y, m in month_labels:
        label = f"{y}-{m:02d}"
        start = date(y, m, 1)
        if m == 12:
            end = date(y + 1, 1, 1)
        else:
            end = date(y, m + 1, 1)

        # Cost actuals this month
        monthly_actual = db.query(func.sum(CostActual.amount)).filter(
            CostActual.project_id.in_(project_ids),
            CostActual.expense_date >= start,
            CostActual.expense_date < end,
        ).scalar() or 0 if project_ids else 0

        # Safety incidents this month
        monthly_incidents = db.query(func.count(IncidentReport.id)).filter(
            IncidentReport.project_id.in_(project_ids),
            IncidentReport.incident_date >= start,
            IncidentReport.incident_date < end,
        ).scalar() or 0 if project_ids else 0

        # Document completion rate this month
        subs_this_month = db.query(func.count(Submission.id)).filter(
            Submission.project_id.in_(project_ids),
            Submission.created_at >= datetime(y, m, 1),
            Submission.created_at < datetime(y + 1 if m == 12 else y, 1 if m == 12 else m + 1, 1),
        ).scalar() or 0 if project_ids else 0

        approved_this_month = db.query(func.count(Submission.id)).filter(
            Submission.project_id.in_(project_ids),
            Submission.created_at >= datetime(y, m, 1),
            Submission.created_at < datetime(y + 1 if m == 12 else y, 1 if m == 12 else m + 1, 1),
            Submission.status == "approved",
        ).scalar() or 0 if project_ids else 0

        doc_rate = round(approved_this_month / subs_this_month * 100, 1) if subs_this_month else 0

        # Worker attendance count this month
        worker_count = db.query(func.count(Attendance.id)).filter(
            Attendance.project_id.in_(project_ids),
            Attendance.work_date >= start,
            Attendance.work_date < end,
        ).scalar() or 0 if project_ids else 0

        result.append({
            "month": label,
            "actual_cost": int(monthly_actual),
            "incident_count": int(monthly_incidents),
            "document_completion_rate": doc_rate,
            "worker_attendance_count": int(worker_count),
        })

    return result


@router.get("/safety-overview")
def safety_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cross-project safety KPIs dashboard."""
    projects = db.query(Project).filter(Project.tenant_id == user.tenant_id).all()
    project_ids = [p.id for p in projects]

    if not project_ids:
        return {
            "total_incidents": 0,
            "open_incidents": 0,
            "critical_incidents": 0,
            "total_ky_activities": 0,
            "total_patrols": 0,
            "total_trainings": 0,
            "incidents_by_severity": {},
            "incidents_by_type": {},
            "recent_incidents": [],
            "monthly_trend": [],
        }

    total_incidents = db.query(func.count(IncidentReport.id)).filter(
        IncidentReport.project_id.in_(project_ids)
    ).scalar() or 0

    open_incidents = db.query(func.count(IncidentReport.id)).filter(
        IncidentReport.project_id.in_(project_ids),
        IncidentReport.status.in_(["reported", "investigating"]),
    ).scalar() or 0

    critical_incidents = db.query(func.count(IncidentReport.id)).filter(
        IncidentReport.project_id.in_(project_ids),
        IncidentReport.severity.in_(["critical", "high"]),
    ).scalar() or 0

    total_ky = db.query(func.count(KYActivity.id)).filter(
        KYActivity.project_id.in_(project_ids)
    ).scalar() or 0

    total_patrols = db.query(func.count(SafetyPatrol.id)).filter(
        SafetyPatrol.project_id.in_(project_ids)
    ).scalar() or 0

    total_trainings = db.query(func.count(SafetyTraining.id)).filter(
        SafetyTraining.project_id.in_(project_ids)
    ).scalar() or 0

    # Severity breakdown
    sev_rows = db.query(IncidentReport.severity, func.count(IncidentReport.id)).filter(
        IncidentReport.project_id.in_(project_ids)
    ).group_by(IncidentReport.severity).all()
    by_severity = {row[0]: row[1] for row in sev_rows}

    # Type breakdown
    type_rows = db.query(IncidentReport.incident_type, func.count(IncidentReport.id)).filter(
        IncidentReport.project_id.in_(project_ids)
    ).group_by(IncidentReport.incident_type).all()
    by_type = {row[0]: row[1] for row in type_rows}

    # Recent 5 incidents
    project_map = {p.id: p.name for p in projects}
    recent = db.query(IncidentReport).filter(
        IncidentReport.project_id.in_(project_ids)
    ).order_by(IncidentReport.incident_date.desc()).limit(5).all()
    recent_list = [
        {
            "id": inc.id,
            "project_id": inc.project_id,
            "project_name": project_map.get(inc.project_id, ""),
            "incident_date": inc.incident_date.isoformat() if inc.incident_date else None,
            "incident_type": inc.incident_type,
            "severity": inc.severity,
            "description": inc.description,
            "status": inc.status,
        }
        for inc in recent
    ]

    # Last 6 months trend
    today = date.today()
    monthly = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        start = date(y, m, 1)
        end = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
        cnt = db.query(func.count(IncidentReport.id)).filter(
            IncidentReport.project_id.in_(project_ids),
            IncidentReport.incident_date >= start,
            IncidentReport.incident_date < end,
        ).scalar() or 0
        monthly.append({"month": f"{y}-{m:02d}", "incident_count": int(cnt)})

    return {
        "total_incidents": int(total_incidents),
        "open_incidents": int(open_incidents),
        "critical_incidents": int(critical_incidents),
        "total_ky_activities": int(total_ky),
        "total_patrols": int(total_patrols),
        "total_trainings": int(total_trainings),
        "incidents_by_severity": by_severity,
        "incidents_by_type": by_type,
        "recent_incidents": recent_list,
        "monthly_trend": monthly,
    }


@router.get("/risk-matrix")
def dashboard_risk_matrix(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """全プロジェクトリスクマトリクス（重大度×発生可能性）"""
    projects = db.query(Project).filter(Project.tenant_id == user.tenant_id).all()
    project_ids = [p.id for p in projects]

    project_map = {p.id: p.name for p in projects}

    # Use corrective actions as risk proxy
    ncrs = db.query(CorrectiveAction).filter(
        CorrectiveAction.project_id.in_(project_ids),
        CorrectiveAction.status.in_(["open", "in_progress"]),
    ).all() if project_ids else []

    severity_map = {
        "critical": 5, "high": 4, "medium": 3, "low": 2, "minor": 1,
    }
    likelihood_map = {
        "in_progress": 4, "open": 3,
    }

    risk_items = []
    for ncr in ncrs:
        severity_score = severity_map.get(getattr(ncr, "severity", "medium"), 3)
        likelihood_score = likelihood_map.get(ncr.status, 2)
        risk_items.append({
            "id": ncr.id,
            "project_id": ncr.project_id,
            "project_name": project_map.get(ncr.project_id, ""),
            "title": ncr.title,
            "status": ncr.status,
            "severity": severity_score,
            "likelihood": likelihood_score,
            "risk_score": severity_score * likelihood_score,
        })

    # Also include open incidents
    incidents = db.query(IncidentReport).filter(
        IncidentReport.project_id.in_(project_ids),
        IncidentReport.status.in_(["reported", "investigating"]),
    ).all() if project_ids else []

    incident_severity_map = {
        "critical": 5, "major": 4, "moderate": 3, "minor": 2,
    }
    for inc in incidents:
        sev = incident_severity_map.get(inc.severity, 2)
        likelihood = 3 if inc.status == "investigating" else 2
        risk_items.append({
            "id": inc.id,
            "project_id": inc.project_id,
            "project_name": project_map.get(inc.project_id, ""),
            "title": f"[安全] {inc.incident_type}: {inc.description[:50] if inc.description else ''}",
            "status": inc.status,
            "severity": sev,
            "likelihood": likelihood,
            "risk_score": sev * likelihood,
        })

    risk_items.sort(key=lambda x: x["risk_score"], reverse=True)

    # Grid summary: 5x5 matrix count
    matrix: list[list[int]] = [[0] * 5 for _ in range(5)]
    for item in risk_items:
        s = min(max(item["severity"], 1), 5) - 1
        l = min(max(item["likelihood"], 1), 5) - 1
        matrix[l][s] += 1

    return {
        "items": risk_items,
        "matrix": matrix,  # matrix[likelihood_0indexed][severity_0indexed]
    }
