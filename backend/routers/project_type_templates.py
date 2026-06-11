"""案件種別テンプレート API (G12) — CRUD。"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.project_type_template import ProjectTypeTemplate
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/project-type-templates", tags=["project-type-templates"])


# ---------- Schemas ----------

class ProjectTypeTemplateCreate(BaseModel):
    name: str
    project_type: str | None = None
    default_sections: Any | None = None


class ProjectTypeTemplateUpdate(BaseModel):
    name: str | None = None
    project_type: str | None = None
    default_sections: Any | None = None


# ---------- Endpoints ----------

@router.get("")
def list_templates(
    project_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """テナント内の案件種別テンプレ一覧。project_type でフィルタ可能。"""
    q = db.query(ProjectTypeTemplate).filter(
        ProjectTypeTemplate.tenant_id == user.tenant_id,
    )
    if project_type:
        q = q.filter(ProjectTypeTemplate.project_type == project_type)
    return q.order_by(ProjectTypeTemplate.created_at.desc()).all()


@router.post("", status_code=201)
def create_template(
    body: ProjectTypeTemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """案件種別テンプレを作成。"""
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=422, detail="テンプレート名は必須です")
    record = ProjectTypeTemplate(
        tenant_id=user.tenant_id,
        name=body.name.strip(),
        project_type=body.project_type,
        default_sections=body.default_sections,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{tid}")
def update_template(
    tid: str,
    body: ProjectTypeTemplateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """案件種別テンプレを更新。"""
    record = db.query(ProjectTypeTemplate).filter(
        ProjectTypeTemplate.id == tid,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="案件種別テンプレートが見つかりません")
    if record.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="このテンプレートを操作する権限がありません")
    data = body.model_dump(exclude_unset=True)
    if "name" in data and (data["name"] is None or not str(data["name"]).strip()):
        raise HTTPException(status_code=422, detail="テンプレート名は必須です")
    for k, v in data.items():
        if k == "name" and isinstance(v, str):
            v = v.strip()
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{tid}", status_code=204)
def delete_template(
    tid: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """案件種別テンプレを削除。"""
    record = db.query(ProjectTypeTemplate).filter(
        ProjectTypeTemplate.id == tid,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="案件種別テンプレートが見つかりません")
    if record.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="このテンプレートを操作する権限がありません")
    db.delete(record)
    db.commit()
    return None
