"""通知自動生成トリガー — 各イベント発生時に呼び出す

使い方: 各ルーターのPOST/PUT成功後に対応する関数を呼ぶ
全てAPIファースト: このサービスはルーター内からのみ呼ばれる
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from services.timezone_utils import today_jst

from models.notification import Notification
from models.user import User
from models.project import Project


def _notify(db: Session, tenant_id: str, user_id: str, ntype: str,
            title: str, message: str = None, link_url: str = None,
            entity_type: str = None, entity_id: str = None):
    """通知を1件作成"""
    n = Notification(
        tenant_id=tenant_id, user_id=user_id,
        notification_type=ntype, title=title, message=message,
        link_url=link_url, related_entity_type=entity_type,
        related_entity_id=entity_id,
    )
    db.add(n)


def _notify_admins(db: Session, tenant_id: str, ntype: str,
                   title: str, message: str = None, link_url: str = None,
                   entity_type: str = None, entity_id: str = None,
                   exclude_user_id: str = None):
    """テナントの管理者・工事長全員に通知"""
    admins = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role.in_(["admin", "project_manager"]),
        User.is_active == True,
    ).all()
    for admin in admins:
        if admin.id == exclude_user_id:
            continue
        _notify(db, tenant_id, admin.id, ntype, title, message,
                link_url, entity_type, entity_id)


# ─── 日報関連 ───

def on_daily_report_submitted(db: Session, tenant_id: str, project_id: str,
                               report_date: str, submitted_by_name: str):
    """日報が提出されたら管理者に通知"""
    _notify_admins(
        db, tenant_id, "approval_request",
        title=f"日報承認依頼: {report_date}",
        message=f"{submitted_by_name}が日報を提出しました",
        link_url=f"/projects/{project_id}/daily-reports",
        entity_type="daily_report", entity_id=project_id,
    )
    db.commit()


def on_daily_report_approved(db: Session, tenant_id: str, project_id: str,
                              report_id: str, submitted_by: str):
    """日報が承認されたら提出者に通知"""
    _notify(db, tenant_id, submitted_by, "approval_result",
            title="日報が承認されました",
            link_url=f"/projects/{project_id}/daily-reports",
            entity_type="daily_report", entity_id=report_id)
    db.commit()


# ─── 検査関連 ───

def on_inspection_scheduled(db: Session, tenant_id: str, project_id: str,
                             inspection_title: str, scheduled_date: str):
    """検査が予定されたら関係者に通知"""
    _notify_admins(
        db, tenant_id, "inspection_scheduled",
        title=f"検査予定: {inspection_title} ({scheduled_date})",
        link_url=f"/projects/{project_id}/inspections",
        entity_type="inspection", entity_id=project_id,
    )
    db.commit()


# ─── コンクリート養生 ───

def on_concrete_curing_alert(db: Session, tenant_id: str, project_id: str,
                              location: str, alert_type: str, target_date: str):
    """養生終了・脱型・試験日が近づいたら通知"""
    titles = {
        "curing": f"養生終了間近: {location} ({target_date})",
        "formwork": f"脱型可能日: {location} ({target_date})",
        "test": f"強度試験予定: {location} ({target_date})",
    }
    _notify_admins(
        db, tenant_id, "deadline",
        title=titles.get(alert_type, f"コンクリート: {location}"),
        link_url=f"/projects/{project_id}/concrete",
        entity_type="concrete", entity_id=project_id,
    )
    db.commit()


# ─── 是正措置 ───

def on_ncr_created(db: Session, tenant_id: str, project_id: str,
                    ncr_title: str, assigned_to: str = None):
    """NCRが作成されたら通知"""
    _notify_admins(
        db, tenant_id, "ncr_created",
        title=f"是正措置: {ncr_title}",
        link_url=f"/projects/{project_id}/corrective-actions",
        entity_type="corrective_action", entity_id=project_id,
    )
    if assigned_to:
        _notify(db, tenant_id, assigned_to, "ncr_assigned",
                title=f"是正措置が割り当てられました: {ncr_title}",
                link_url=f"/projects/{project_id}/corrective-actions")
    db.commit()


# ─── 書類完成 ───

def on_submission_generated(db: Session, tenant_id: str, project_id: str,
                             submission_title: str):
    """提出書類が自動生成されたら通知"""
    _notify_admins(
        db, tenant_id, "document_ready",
        title=f"書類生成完了: {submission_title}",
        link_url=f"/projects/{project_id}/documents",
        entity_type="submission", entity_id=project_id,
    )
    db.commit()


# ─── 報告書承認 ───

def on_report_approved(db: Session, tenant_id: str, project_id: str,
                        report_title: str, submitted_by: str):
    """報告書が承認されたら提出者に通知"""
    _notify(db, tenant_id, submitted_by, "approval_result",
            title=f"報告書承認: {report_title}",
            link_url=f"/projects/{project_id}",
            entity_type="report", entity_id=project_id)
    db.commit()


# ─── 定期チェック（API経由で呼び出し） ───

def check_upcoming_deadlines(db: Session, tenant_id: str):
    """期限3日以内のアイテムを通知（cron/スケジューラから呼ぶAPI用）"""
    from models.inspection import Inspection
    from models.corrective_action import CorrectiveAction
    from models.concrete_curing import ConcretePlacement
    from models.worker import WorkerQualification

    today = today_jst()
    soon = today + timedelta(days=3)
    count = 0

    # 検査予定
    inspections = db.query(Inspection, Project).join(
        Project, Inspection.project_id == Project.id
    ).filter(
        Project.tenant_id == tenant_id,
        Inspection.status == "scheduled",
        Inspection.scheduled_date <= soon,
        Inspection.scheduled_date >= today,
    ).all()
    for insp, proj in inspections:
        days = (insp.scheduled_date - today).days
        _notify_admins(db, tenant_id, "deadline",
            title=f"検査{days}日後: {insp.title}",
            link_url=f"/projects/{proj.id}/inspections")
        count += 1

    # コンクリート養生
    placements = db.query(ConcretePlacement).join(
        Project, ConcretePlacement.project_id == Project.id
    ).filter(
        Project.tenant_id == tenant_id,
        ConcretePlacement.curing_completed == False,
        ConcretePlacement.curing_end_target <= soon,
        ConcretePlacement.curing_end_target >= today,
    ).all()
    for cp in placements:
        days = (cp.curing_end_target - today).days
        _notify_admins(db, tenant_id, "deadline",
            title=f"養生終了{days}日後: {cp.location}",
            link_url=f"/projects/{cp.project_id}/concrete")
        count += 1

    # NCR期限
    ncrs = db.query(CorrectiveAction).join(
        Project, CorrectiveAction.project_id == Project.id
    ).filter(
        Project.tenant_id == tenant_id,
        CorrectiveAction.status.in_(["open", "in_progress"]),
        CorrectiveAction.due_date <= soon,
        CorrectiveAction.due_date >= today,
    ).all()
    for ncr in ncrs:
        days = (ncr.due_date - today).days
        _notify_admins(db, tenant_id, "deadline",
            title=f"是正措置期限{days}日後: {ncr.title}",
            link_url=f"/projects/{ncr.project_id}/corrective-actions")
        count += 1

    db.commit()
    return count
