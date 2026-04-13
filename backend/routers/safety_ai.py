"""AI安全スコア API ルーター — 安全スコア・7日間リスク予測."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.safety_ai import calculate_safety_score, predict_risk_7days, generate_ky_draft

router = APIRouter(
    prefix="/api/projects/{project_id}/safety", tags=["safety-ai"]
)


@router.get("/ai-score")
def get_ai_safety_score(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトの現在の安全スコア (0-100) と要因内訳を返す。"""
    verify_project_access(project_id, user, db)
    return calculate_safety_score(project_id, db)


@router.get("/ai-predictions")
def get_ai_risk_predictions(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """今後7日間のリスク予測を返す。"""
    verify_project_access(project_id, user, db)
    return predict_risk_7days(project_id, db)


@router.get("/ai-ky-draft")
def get_ai_ky_draft(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """現場データに基づいたKY活動の下書きを自動生成。

    過去のインシデント、天候、工種、季節を分析し、
    その現場特有の危険予知シートの下書きを返す。
    現場監督の書類作成時間を削減。
    """
    verify_project_access(project_id, user, db)
    return generate_ky_draft(project_id, db)
