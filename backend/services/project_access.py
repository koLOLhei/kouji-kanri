"""プロジェクトアクセス検証 — テナント分離を確実にする共通ヘルパー

使い方:
1. 単純な関数呼び出し:
       project = verify_project_access(project_id, user, db)
2. FastAPI Dependency として注入:
       Depends(ProjectAccessChecker())
3. 任意モデルへのテナントフィルタ:
       db.query(Material).filter(tenant_filter(Material, user)).all()
4. 施設アクセス検証:
       facility = verify_facility_access(facility_id, user, db)
5. 作業員アクセス検証:
       worker = verify_worker_access(worker_id, user, db)
"""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.user import User


def verify_project_access(project_id: str, user: User, db: Session) -> Project:
    """ユーザーが所属するテナントのプロジェクトかを検証。

    Args:
        project_id: 検索するプロジェクト ID。
        user: 現在認証済みのユーザー（tenant_id を保持）。
        db: SQLAlchemy セッション。

    Returns:
        一致した Project オブジェクト。

    Raises:
        HTTPException(404): プロジェクトが存在しないか、別テナントの場合。
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")
    return project


def tenant_filter(model_class, user: User):
    """任意モデルへのテナントスコープフィルタ条件を返す。

    対象モデルが ``tenant_id`` 列を持つことを前提とする。

    使用例::

        materials = (
            db.query(Material)
            .filter(tenant_filter(Material, user))
            .all()
        )

    Args:
        model_class: SQLAlchemy モデルクラス（``tenant_id`` 列を持つこと）。
        user: 現在認証済みのユーザー。

    Returns:
        SQLAlchemy フィルタ条件（``BinaryExpression``）。
    """
    return model_class.tenant_id == user.tenant_id


def verify_facility_access(facility_id: str, user: User, db: Session):
    """ユーザーが所属するテナントの施設かを検証。

    Raises:
        HTTPException(404): 施設が存在しないか、別テナントの場合。
    """
    from models.facility import Facility

    facility = db.query(Facility).filter(
        Facility.id == facility_id,
        Facility.tenant_id == user.tenant_id,
    ).first()
    if not facility:
        raise HTTPException(status_code=404, detail="施設が見つかりません")
    return facility


def verify_worker_access(worker_id: str, user: User, db: Session):
    """ユーザーが所属するテナントの作業員かを検証。

    Raises:
        HTTPException(404): 作業員が存在しないか、別テナントの場合。
    """
    from models.worker import Worker

    worker = db.query(Worker).filter(
        Worker.id == worker_id,
        Worker.tenant_id == user.tenant_id,
    ).first()
    if not worker:
        raise HTTPException(status_code=404, detail="作業員が見つかりません")
    return worker
