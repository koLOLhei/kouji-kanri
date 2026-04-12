"""承認キュー + 期限アラート + プロジェクトヘルス — 管理者が楽になるためのAPI"""

from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from services.timezone_utils import today_jst

from database import get_db
from models.project import Project
from models.phase import Phase, PhaseRequirement
from models.photo import Photo
from models.report import Report
from models.daily_report import DailyReport
from models.inspection import Inspection
from models.submission import Submission
from models.corrective_action import CorrectiveAction
from models.worker import WorkerQualification
from models.milestone import Milestone
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["management"])


# ─── 承認キュー: 承認待ちの全アイテムを一覧 ───

@router.get("/approval-queue")
def approval_queue(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """管理者が承認すべき全アイテムを一覧表示。これ1画面で全承認が完結。"""
    items = []

    # 1. 日報 (status=submitted → 承認待ち)
    pending_reports = db.query(DailyReport, Project.name).join(
        Project, DailyReport.project_id == Project.id
    ).filter(
        Project.tenant_id == user.tenant_id,
        DailyReport.status == "submitted",
    ).order_by(DailyReport.report_date.desc()).all()

    for dr, proj_name in pending_reports:
        items.append({
            "type": "daily_report",
            "type_label": "日報",
            "id": dr.id,
            "title": f"{dr.report_date} の日報",
            "project_name": proj_name,
            "project_id": dr.project_id,
            "date": dr.report_date.isoformat(),
            "submitted_by": dr.submitted_by,
            "action_url": f"/projects/{dr.project_id}/daily-reports",
            "api_url": f"/api/projects/{dr.project_id}/daily-reports/{dr.id}/approve",
        })

    # 2. 報告書 (status=submitted → 承認待ち)
    pending_docs = db.query(Report, Project.name).join(
        Project, Report.project_id == Project.id
    ).filter(
        Project.tenant_id == user.tenant_id,
        Report.status == "submitted",
    ).order_by(Report.created_at.desc()).all()

    for rpt, proj_name in pending_docs:
        items.append({
            "type": "report",
            "type_label": "報告書",
            "id": rpt.id,
            "title": rpt.title,
            "project_name": proj_name,
            "project_id": rpt.project_id,
            "date": rpt.created_at.isoformat(),
            "submitted_by": rpt.submitted_by,
            "action_url": f"/projects/{rpt.project_id}/phases/{rpt.phase_id}" if rpt.phase_id else f"/projects/{rpt.project_id}",
            "api_url": f"/api/projects/{rpt.project_id}/reports/{rpt.id}/review?action=approve",
        })

    return {
        "total": len(items),
        "items": items,
    }


# ─── 期限アラート: 今後の重要期限を自動集約 ───

@router.get("/alerts")
def deadline_alerts(
    days: int = 14,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """今後N日以内の期限アラートを自動生成。見逃しゼロ。"""
    today = today_jst()
    deadline = today + timedelta(days=days)
    alerts = []

    # 1. 検査予定 (scheduled, まだ未実施)
    upcoming_inspections = db.query(Inspection, Project.name).join(
        Project, Inspection.project_id == Project.id
    ).filter(
        Project.tenant_id == user.tenant_id,
        Inspection.status == "scheduled",
        Inspection.scheduled_date != None,
        Inspection.scheduled_date <= deadline,
    ).order_by(Inspection.scheduled_date).all()

    for insp, proj_name in upcoming_inspections:
        days_until = (insp.scheduled_date - today).days
        alerts.append({
            "type": "inspection",
            "severity": "critical" if days_until <= 3 else "warning" if days_until <= 7 else "info",
            "title": f"検査予定: {insp.title}",
            "project_name": proj_name,
            "date": insp.scheduled_date.isoformat(),
            "days_until": days_until,
            "action_url": f"/projects/{insp.project_id}/inspections",
        })

    # 2. マイルストーン期限
    upcoming_milestones = db.query(Milestone, Project.name).join(
        Project, Milestone.project_id == Project.id
    ).filter(
        Project.tenant_id == user.tenant_id,
        Milestone.status == "upcoming",
        Milestone.due_date <= deadline,
    ).order_by(Milestone.due_date).all()

    for ms, proj_name in upcoming_milestones:
        days_until = (ms.due_date - today).days
        alerts.append({
            "type": "milestone",
            "severity": "critical" if days_until <= 3 else "warning" if days_until <= 7 else "info",
            "title": f"マイルストーン: {ms.title}",
            "project_name": proj_name,
            "date": ms.due_date.isoformat(),
            "days_until": days_until,
            "action_url": f"/projects/{ms.project_id}/calendar",
        })

    # 3. 是正措置の期限
    overdue_ncr = db.query(CorrectiveAction, Project.name).join(
        Project, CorrectiveAction.project_id == Project.id
    ).filter(
        Project.tenant_id == user.tenant_id,
        CorrectiveAction.status.in_(["open", "in_progress"]),
        CorrectiveAction.due_date != None,
        CorrectiveAction.due_date <= deadline,
    ).order_by(CorrectiveAction.due_date).all()

    for ncr, proj_name in overdue_ncr:
        days_until = (ncr.due_date - today).days
        alerts.append({
            "type": "corrective_action",
            "severity": "critical" if days_until <= 0 else "warning",
            "title": f"是正措置: {ncr.title}",
            "project_name": proj_name,
            "date": ncr.due_date.isoformat(),
            "days_until": days_until,
            "action_url": f"/projects/{ncr.project_id}/corrective-actions",
        })

    # 4. 資格期限切れ間近の作業員
    expiring_quals = db.query(WorkerQualification).filter(
        WorkerQualification.expiry_date != None,
        WorkerQualification.expiry_date <= deadline,
        WorkerQualification.expiry_date >= today,
    ).all()

    for qual in expiring_quals:
        days_until = (qual.expiry_date - today).days
        alerts.append({
            "type": "qualification_expiry",
            "severity": "warning" if days_until <= 7 else "info",
            "title": f"資格期限: {qual.qualification_name}",
            "project_name": "",
            "date": qual.expiry_date.isoformat(),
            "days_until": days_until,
            "action_url": f"/workers/{qual.worker_id}",
        })

    # Sort by severity then days_until
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: (severity_order.get(a["severity"], 9), a["days_until"]))

    return {
        "total": len(alerts),
        "critical": sum(1 for a in alerts if a["severity"] == "critical"),
        "warning": sum(1 for a in alerts if a["severity"] == "warning"),
        "alerts": alerts,
    }


# ─── プロジェクトヘルス: 全案件の健全性スコア ───

@router.get("/project-health")
def project_health(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """全プロジェクトの健全性を一目で把握。注意が必要な案件を上に表示。"""
    projects = db.query(Project).filter(
        Project.tenant_id == user.tenant_id,
        Project.status.in_(["planning", "active", "inspection"]),
    ).all()

    health_list = []
    for proj in projects:
        # 工程進捗
        total_phases = db.query(func.count(Phase.id)).filter(Phase.project_id == proj.id).scalar()
        completed_phases = db.query(func.count(Phase.id)).filter(
            Phase.project_id == proj.id, Phase.status == "completed"
        ).scalar()
        phase_progress = round(completed_phases / total_phases * 100) if total_phases > 0 else 0

        # 書類充足率
        total_reqs = db.query(func.count(PhaseRequirement.id)).join(
            Phase, PhaseRequirement.phase_id == Phase.id
        ).filter(Phase.project_id == proj.id, PhaseRequirement.is_mandatory == True).scalar()
        fulfilled_reqs = 0
        if total_reqs > 0:
            reqs = db.query(PhaseRequirement).join(
                Phase, PhaseRequirement.phase_id == Phase.id
            ).filter(Phase.project_id == proj.id, PhaseRequirement.is_mandatory == True).all()
            for req in reqs:
                if req.requirement_type == "photo":
                    c = db.query(func.count(Photo.id)).filter_by(requirement_id=req.id).scalar()
                else:
                    c = db.query(func.count(Report.id)).filter_by(requirement_id=req.id, status="approved").scalar()
                if c >= req.min_count:
                    fulfilled_reqs += 1
        doc_progress = round(fulfilled_reqs / total_reqs * 100) if total_reqs > 0 else 100

        # 未対応是正措置
        open_ncr = db.query(func.count(CorrectiveAction.id)).filter(
            CorrectiveAction.project_id == proj.id,
            CorrectiveAction.status.in_(["open", "in_progress"]),
        ).scalar()

        # 今日の日報有無
        today = today_jst()
        has_today_report = db.query(DailyReport).filter(
            DailyReport.project_id == proj.id,
            DailyReport.report_date == today,
        ).first() is not None

        # 直近の検査
        next_inspection = db.query(Inspection).filter(
            Inspection.project_id == proj.id,
            Inspection.status == "scheduled",
            Inspection.scheduled_date >= today,
        ).order_by(Inspection.scheduled_date).first()

        # ヘルススコア (100点満点)
        score = 100
        if phase_progress < 30 and proj.status == "active":
            score -= 10
        if doc_progress < 50:
            score -= 20
        elif doc_progress < 80:
            score -= 10
        if open_ncr > 0:
            score -= min(open_ncr * 5, 20)
        if not has_today_report and proj.status == "active":
            score -= 10
        score = max(0, score)

        health_list.append({
            "project_id": proj.id,
            "project_name": proj.name,
            "project_code": proj.project_code,
            "status": proj.status,
            "health_score": score,
            "phase_progress": phase_progress,
            "doc_progress": doc_progress,
            "total_phases": total_phases,
            "completed_phases": completed_phases,
            "open_ncr": open_ncr,
            "has_today_report": has_today_report,
            "next_inspection": {
                "title": next_inspection.title,
                "date": next_inspection.scheduled_date.isoformat(),
            } if next_inspection else None,
        })

    # スコアの低い順にソート
    health_list.sort(key=lambda h: h["health_score"])

    return {
        "projects": health_list,
        "average_score": round(sum(h["health_score"] for h in health_list) / len(health_list)) if health_list else 100,
    }
