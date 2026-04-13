"""施工事例自動生成 API — 完了工事からHPコンテンツの素材を自動生成。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.case_study_generator import generate_case_study, list_publishable_projects

router = APIRouter(tags=["case-study"])


@router.get("/api/case-studies")
def list_case_studies(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """公開可能な施工事例の一覧。完了/保証中の案件を表示。"""
    return list_publishable_projects(user.tenant_id, db)


@router.get("/api/projects/{project_id}/case-study")
def get_case_study(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """案件の施工事例データを自動生成。HP掲載用のSEOテキスト素材を含む。"""
    verify_project_access(project_id, user, db)
    try:
        return generate_case_study(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
