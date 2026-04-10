"""プロジェクトアクセス検証 Dependency — ルーター関数のシグネチャに注入して使う

使い方:
    from services.project_deps import ProjectAccess
    
    @router.get("")
    def my_endpoint(
        project_id: str,
        access: ProjectAccess = Depends(),  # ← これだけで検証される
        ...
    ):
"""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.user import User
from services.auth_service import get_current_user


class ProjectAccess:
    """Dependency: project_id のテナントアクセスを自動検証"""
    def __call__(
        self,
        project_id: str,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Project:
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.tenant_id == user.tenant_id,
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="案件が見つかりません")
        return project
