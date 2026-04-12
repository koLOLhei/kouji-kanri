"""オンボーディングウィザードAPI — 初期設定の進捗確認とスキップ"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.phase import Phase
from models.photo import Photo
from models.daily_report import DailyReport
from models.tenant import Tenant
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.get("/status")
def get_onboarding_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ユーザーのオンボーディング進捗を返す"""
    tid = user.tenant_id

    # テナント情報チェック
    tenant = db.query(Tenant).filter(Tenant.id == tid).first()
    has_company_info = bool(tenant and tenant.name and tenant.name.strip())

    # テナント設定でオンボーディングスキップ済みかチェック
    tenant_settings = tenant.settings if tenant and tenant.settings else {}
    if tenant_settings.get("onboarding_completed"):
        return {
            "has_company_info": has_company_info,
            "has_first_project": True,
            "has_phases": True,
            "has_photo": True,
            "has_daily_report": True,
            "completion_percent": 100,
            "next_step": "complete",
            "next_step_url": "/projects",
        }

    # プロジェクト (subqueryで全件取得を避ける)
    project_subq = db.query(Project.id).filter(Project.tenant_id == tid).subquery()
    has_first_project = db.query(Project).filter(Project.tenant_id == tid).limit(1).count() > 0

    # 工程
    phase_count = db.query(Phase).filter(Phase.project_id.in_(project_subq)).limit(1).count()
    has_phases = phase_count > 0

    # 写真
    photo_count = db.query(Photo).filter(Photo.project_id.in_(project_subq)).limit(1).count()
    has_photo = photo_count > 0

    # 日報
    dr_count = db.query(DailyReport).filter(DailyReport.project_id.in_(project_subq)).limit(1).count()
    has_daily_report = dr_count > 0

    # 次のステップ用に最初のプロジェクトIDが必要な場合のみ取得
    first_project = db.query(Project.id).filter(Project.tenant_id == tid).limit(1).first()
    first_pid = first_project[0] if first_project else None

    # 進捗計算
    steps = [has_company_info, has_first_project, has_phases, has_photo, has_daily_report]
    completed = sum(1 for s in steps if s)
    completion_percent = int((completed / len(steps)) * 100)

    # 次のステップ判定
    if not has_first_project:
        next_step = "create_project"
        next_step_url = "/projects/new"
    elif not has_phases:
        next_step = "init_phases"
        next_step_url = f"/projects/{first_pid}"
    elif not has_photo:
        next_step = "upload_photo"
        next_step_url = f"/projects/{first_pid}"
    elif not has_daily_report:
        next_step = "create_daily_report"
        next_step_url = f"/projects/{first_pid}/daily-reports"
    else:
        next_step = "complete"
        next_step_url = "/projects"

    return {
        "has_company_info": has_company_info,
        "has_first_project": has_first_project,
        "has_phases": has_phases,
        "has_photo": has_photo,
        "has_daily_report": has_daily_report,
        "completion_percent": completion_percent,
        "next_step": next_step,
        "next_step_url": next_step_url,
    }


@router.post("/skip")
def skip_onboarding(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """オンボーディングを完了済みとしてマーク（テナント設定に保存）"""
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if tenant:
        settings = tenant.settings or {}
        settings["onboarding_completed"] = True
        tenant.settings = settings
        # JSON列の変更検知のため明示的にマーク
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(tenant, "settings")
        db.commit()
    return {"status": "skipped", "onboarding_completed": True}
