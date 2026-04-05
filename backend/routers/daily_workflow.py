"""今日のワークフロー — 現場作業員が朝から夕方まで迷わず動けるAPI"""

from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.phase import Phase
from models.photo import Photo
from models.daily_report import DailyReport
from models.safety import KYActivity
from models.inspection import Inspection
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/today", tags=["daily-workflow"])


@router.get("")
def today_workflow(
    project_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """今日やるべきことを全て返す。作業員はこれだけ見ればいい。"""
    today = date.today()

    # アクティブな案件を取得
    q = db.query(Project).filter(
        Project.tenant_id == user.tenant_id,
        Project.status.in_(["active", "inspection"]),
    )
    if project_id:
        q = q.filter(Project.id == project_id)
    projects = q.all()

    workflow_items = []

    for proj in projects:
        # 1. KY活動 — 今日やったか？
        ky_done = db.query(KYActivity).filter(
            KYActivity.project_id == proj.id,
            KYActivity.activity_date == today,
        ).first()

        # 2. 日報 — 今日書いたか？
        daily_report = db.query(DailyReport).filter(
            DailyReport.project_id == proj.id,
            DailyReport.report_date == today,
        ).first()

        # 3. 今日の写真枚数
        today_photos = db.query(func.count(Photo.id)).filter(
            Photo.project_id == proj.id,
            func.date(Photo.created_at) == today,
        ).scalar()

        # 4. 今日の検査予定
        today_inspections = db.query(Inspection).filter(
            Inspection.project_id == proj.id,
            Inspection.scheduled_date == today,
            Inspection.status == "scheduled",
        ).all()

        # 5. 進行中の工程
        active_phases = db.query(Phase).filter(
            Phase.project_id == proj.id,
            Phase.status == "in_progress",
        ).all()

        # ワークフローステップを構築
        steps = []

        # Step 1: KY活動
        steps.append({
            "order": 1,
            "key": "ky",
            "title": "KY活動",
            "description": "本日の危険予知活動を記録",
            "status": "done" if ky_done else "todo",
            "action_url": f"/projects/{proj.id}/safety",
            "api_url": f"/api/projects/{proj.id}/safety/ky-activities",
        })

        # Step 2: 写真撮影
        steps.append({
            "order": 2,
            "key": "photos",
            "title": "写真撮影",
            "description": f"本日 {today_photos} 枚撮影済み",
            "status": "done" if today_photos >= 1 else "todo",
            "count": today_photos,
            "action_url": f"/capture?project={proj.id}",
        })

        # Step 3: 検査対応 (ある場合のみ)
        if today_inspections:
            for insp in today_inspections:
                steps.append({
                    "order": 3,
                    "key": "inspection",
                    "title": f"検査: {insp.title}",
                    "description": f"検査員: {insp.inspector_name or '未定'}",
                    "status": "todo",
                    "action_url": f"/projects/{proj.id}/inspections",
                })

        # Step 4: 日報作成
        steps.append({
            "order": 4,
            "key": "daily_report",
            "title": "日報作成",
            "description": "本日の作業内容を記録",
            "status": "done" if daily_report else "todo",
            "daily_report_status": daily_report.status if daily_report else None,
            "action_url": f"/projects/{proj.id}/daily-reports",
        })

        todo_count = sum(1 for s in steps if s["status"] == "todo")
        done_count = sum(1 for s in steps if s["status"] == "done")

        workflow_items.append({
            "project_id": proj.id,
            "project_name": proj.name,
            "project_code": proj.project_code,
            "steps": steps,
            "todo_count": todo_count,
            "done_count": done_count,
            "total_steps": len(steps),
            "completion_percent": round(done_count / len(steps) * 100) if steps else 100,
            "active_phases": [
                {"id": p.id, "name": p.name, "phase_code": p.phase_code}
                for p in active_phases
            ],
        })

    return {
        "date": today.isoformat(),
        "day_of_week": ["月", "火", "水", "木", "金", "土", "日"][today.weekday()],
        "projects": workflow_items,
    }
