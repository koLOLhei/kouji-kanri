"""プロジェクトアクセス検証 — テナント分離を確実にする共通ヘルパー

2つの使い方:
1. 関数内で呼ぶ: verify_project_access(project_id, user, db)
2. Dependencyとして注入: Depends(ProjectAccessChecker())
"""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.user import User


def verify_project_access(project_id: str, user: User, db: Session) -> Project:
    """ユーザーが所属するテナントのプロジェクトかを検証。"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")
    return project
