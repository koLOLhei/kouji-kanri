"""顧客ポータル — 発注者・クライアントへの進捗共有

2つのAPI群:
1. 管理者用: ポータル設定、通知履歴 (認証必要)
2. クライアント用: トークンベースで認証不要の閲覧API
"""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.client_portal import ClientPortalConfig, ClientNotificationLog
from models.project import Project
from models.phase import Phase
from models.photo import Photo
from models.daily_report import DailyReport
from models.inspection import Inspection
from models.submission import Submission
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.storage_service import generate_presigned_url
from services.timezone_utils import today_jst

admin_router = APIRouter(prefix="/api/projects/{project_id}/client-portal", tags=["client-portal"])
public_router = APIRouter(prefix="/api/portal", tags=["client-portal-public"])


# ─── Admin Schemas ───

class PortalConfigCreate(BaseModel):
    show_progress: bool = True
    show_photos: bool = True
    show_daily_reports: bool = True
    show_inspections: bool = True
    show_documents: bool = False
    show_costs: bool = False
    show_safety: bool = False
    auto_email_enabled: bool = True
    email_trigger: str = "daily_report"
    email_recipients: list | None = None
    email_cc: list | None = None
    welcome_message: str | None = None

class PortalConfigUpdate(BaseModel):
    is_enabled: bool | None = None
    show_progress: bool | None = None
    show_photos: bool | None = None
    show_daily_reports: bool | None = None
    show_inspections: bool | None = None
    show_documents: bool | None = None
    show_costs: bool | None = None
    show_safety: bool | None = None
    auto_email_enabled: bool | None = None
    email_trigger: str | None = None
    email_recipients: list | None = None
    email_cc: list | None = None
    welcome_message: str | None = None


# ─── 管理者用API ───

@admin_router.get("/config")
def get_portal_config(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    config = db.query(ClientPortalConfig).filter(ClientPortalConfig.project_id == project_id).first()
    if not config:
        return {"is_configured": False, "project_id": project_id}
    portal_url = f"/api/portal/{config.access_token}"
    return {
        "is_configured": True,
        "config": {c.name: getattr(config, c.name) for c in config.__table__.columns},
        "portal_url": portal_url,
        "full_url": f"{app_settings.app_domain}/portal/{config.access_token}",
    }


@admin_router.post("/config")
def create_portal_config(
    project_id: str, req: PortalConfigCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    existing = db.query(ClientPortalConfig).filter(ClientPortalConfig.project_id == project_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="ポータル設定は既に存在します。PUTで更新してください。")
    config = ClientPortalConfig(project_id=project_id, **req.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return {
        "config": {c.name: getattr(config, c.name) for c in config.__table__.columns},
        "portal_url": f"/api/portal/{config.access_token}",
    }


@admin_router.put("/config")
def update_portal_config(
    project_id: str, req: PortalConfigUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    config = db.query(ClientPortalConfig).filter(ClientPortalConfig.project_id == project_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="ポータル設定が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(config, k, v)
    db.commit()
    db.refresh(config)
    return {c.name: getattr(config, c.name) for c in config.__table__.columns}


@admin_router.post("/regenerate-token")
def regenerate_token(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    import secrets
    config = db.query(ClientPortalConfig).filter(ClientPortalConfig.project_id == project_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="ポータル設定が見つかりません")
    config.access_token = secrets.token_urlsafe(32)
    db.commit()
    return {"new_token": config.access_token, "portal_url": f"/api/portal/{config.access_token}"}


@admin_router.get("/notification-logs")
def list_notification_logs(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(ClientNotificationLog).filter(
        ClientNotificationLog.project_id == project_id
    ).order_by(ClientNotificationLog.created_at.desc()).limit(50).all()


@admin_router.post("/send-now")
def send_notification_now(
    project_id: str,
    notification_type: str = "daily_progress",
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """手動で今すぐクライアントに進捗通知を送る"""
    config = db.query(ClientPortalConfig).filter(
        ClientPortalConfig.project_id == project_id, ClientPortalConfig.is_enabled == True
    ).first()
    if not config:
        raise HTTPException(status_code=400, detail="ポータルが有効化されていません")
    if not config.email_recipients:
        raise HTTPException(status_code=400, detail="メール送信先が設定されていません")

    project = db.query(Project).filter(Project.id == project_id).first()
    portal_url = f"{app_settings.app_domain}/portal/{config.access_token}"

    # 進捗データ収集
    total_phases = db.query(func.count(Phase.id)).filter(Phase.project_id == project_id).scalar()
    completed = db.query(func.count(Phase.id)).filter(Phase.project_id == project_id, Phase.status == "completed").scalar()
    progress = round(completed / total_phases * 100) if total_phases > 0 else 0
    today_photos = db.query(func.count(Photo.id)).filter(Photo.project_id == project_id, func.date(Photo.created_at) == today_jst()).scalar()

    subject = f"【工事進捗】{project.name} - {today_jst().strftime('%Y/%m/%d')} 進捗{progress}%"

    # メール実送信
    from services.email_service import send_progress_email
    email_result = send_progress_email(
        recipients=config.email_recipients,
        project_name=project.name,
        progress_percent=progress,
        portal_url=portal_url,
        today_summary=f"本日の撮影: {today_photos}枚",
        cc=config.email_cc,
    )

    # ログ記録
    log = ClientNotificationLog(
        project_id=project_id,
        notification_type=notification_type,
        subject=subject,
        recipients=config.email_recipients,
        portal_url=portal_url,
        status=email_result.get("status", "unknown"),
        triggered_by=user.id,
        trigger_event="manual_send",
        error_message=email_result.get("error"),
    )
    db.add(log)
    db.commit()

    return {
        "status": email_result.get("status"),
        "subject": subject,
        "recipients": config.email_recipients,
        "portal_url": portal_url,
        "progress": progress,
        "today_photos": today_photos,
        "email_result": email_result,
    }


# ─── クライアント用 公開API (認証不要、トークンで識別) ───

def _get_config_by_token(token: str, db: Session) -> tuple:
    config = db.query(ClientPortalConfig).filter(
        ClientPortalConfig.access_token == token, ClientPortalConfig.is_enabled == True
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="ポータルが見つかりません")
    project = db.query(Project).filter(Project.id == config.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")
    return config, project


@public_router.get("/{token}")
def get_portal_overview(token: str, db: Session = Depends(get_db)):
    """クライアントがURLを開いた時に見る進捗概要"""
    config, project = _get_config_by_token(token, db)

    result = {
        "project_name": project.name,
        "project_code": project.project_code,
        "client_name": project.client_name,
        "contractor_name": project.contractor_name,
        "status": project.status,
        "welcome_message": config.welcome_message,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "sections": [],
    }

    # 工程進捗
    if config.show_progress:
        total = db.query(func.count(Phase.id)).filter(Phase.project_id == project.id).scalar()
        completed = db.query(func.count(Phase.id)).filter(Phase.project_id == project.id, Phase.status == "completed").scalar()
        in_progress = db.query(func.count(Phase.id)).filter(Phase.project_id == project.id, Phase.status == "in_progress").scalar()
        result["progress"] = {
            "total_phases": total,
            "completed": completed,
            "in_progress": in_progress,
            "percent": round(completed / total * 100) if total > 0 else 0,
        }
        result["sections"].append("progress")

    # 最近の写真
    if config.show_photos:
        photos = db.query(Photo).filter(Photo.project_id == project.id).order_by(Photo.created_at.desc()).limit(12).all()
        result["recent_photos"] = [
            {
                "id": p.id, "caption": p.caption, "taken_at": p.taken_at.isoformat() if p.taken_at else None,
                "thumbnail_url": generate_presigned_url(p.thumbnail_key) if p.thumbnail_key else None,
            }
            for p in photos
        ]
        result["sections"].append("photos")

    # 最近の日報
    if config.show_daily_reports:
        reports = db.query(DailyReport).filter(
            DailyReport.project_id == project.id, DailyReport.status.in_(["submitted", "approved"])
        ).order_by(DailyReport.report_date.desc()).limit(7).all()
        result["recent_daily_reports"] = [
            {
                "date": r.report_date.isoformat(),
                "weather_morning": r.weather_morning,
                "weather_afternoon": r.weather_afternoon,
                "worker_count": r.worker_count,
                "work_description": r.work_description,
                "status": r.status,
            }
            for r in reports
        ]
        result["sections"].append("daily_reports")

    # 検査結果
    if config.show_inspections:
        inspections = db.query(Inspection).filter(
            Inspection.project_id == project.id
        ).order_by(Inspection.scheduled_date.desc()).limit(10).all()
        result["inspections"] = [
            {
                "title": i.title, "type": i.inspection_type,
                "date": i.actual_date.isoformat() if i.actual_date else (i.scheduled_date.isoformat() if i.scheduled_date else None),
                "result": i.result, "status": i.status,
            }
            for i in inspections
        ]
        result["sections"].append("inspections")

    # 提出書類
    if config.show_documents:
        subs = db.query(Submission).filter(
            Submission.project_id == project.id, Submission.status.in_(["ready", "submitted"])
        ).order_by(Submission.created_at.desc()).limit(20).all()
        result["documents"] = [
            {"title": s.title, "type": s.submission_type, "status": s.status, "generated_at": s.generated_at.isoformat() if s.generated_at else None}
            for s in subs
        ]
        result["sections"].append("documents")

    return result


@public_router.get("/{token}/photos")
def get_portal_photos(token: str, limit: int = 50, db: Session = Depends(get_db)):
    config, project = _get_config_by_token(token, db)
    if not config.show_photos:
        raise HTTPException(status_code=403, detail="写真の閲覧権限がありません")
    photos = db.query(Photo).filter(Photo.project_id == project.id).order_by(Photo.created_at.desc()).limit(limit).all()
    return [
        {
            "id": p.id, "caption": p.caption, "taken_at": p.taken_at.isoformat() if p.taken_at else None,
            "url": generate_presigned_url(p.file_key) if p.file_key else None,
            "thumbnail_url": generate_presigned_url(p.thumbnail_key) if p.thumbnail_key else None,
        }
        for p in photos
    ]


@public_router.get("/{token}/timeline")
def get_portal_timeline(token: str, db: Session = Depends(get_db)):
    """日別のアクティビティタイムライン"""
    config, project = _get_config_by_token(token, db)

    events = []
    if config.show_daily_reports:
        reports = db.query(DailyReport).filter(
            DailyReport.project_id == project.id, DailyReport.status.in_(["submitted", "approved"])
        ).order_by(DailyReport.report_date.desc()).limit(30).all()
        for r in reports:
            events.append({
                "date": r.report_date.isoformat(), "type": "daily_report",
                "title": f"日報 ({r.weather_morning or ''})", "detail": (r.work_description or "")[:100],
                "worker_count": r.worker_count,
            })

    if config.show_inspections:
        inspections = db.query(Inspection).filter(
            Inspection.project_id == project.id, Inspection.status != "cancelled"
        ).order_by(Inspection.scheduled_date.desc()).limit(20).all()
        for i in inspections:
            d = i.actual_date or i.scheduled_date
            if d:
                events.append({
                    "date": d.isoformat(), "type": "inspection",
                    "title": i.title, "detail": f"結果: {i.result}",
                })

    if config.show_photos:
        photo_counts = db.query(
            func.date(Photo.created_at), func.count(Photo.id)
        ).filter(Photo.project_id == project.id).group_by(func.date(Photo.created_at)).order_by(func.date(Photo.created_at).desc()).limit(30).all()
        for d, cnt in photo_counts:
            events.append({
                "date": d.isoformat() if hasattr(d, 'isoformat') else str(d), "type": "photos",
                "title": f"写真 {cnt}枚アップロード", "detail": "",
            })

    events.sort(key=lambda e: e["date"], reverse=True)
    return events
