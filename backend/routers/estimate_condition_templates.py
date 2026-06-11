"""見積条件 (約款) テンプレート API (G4) — CRUD。"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.estimate_condition_template import EstimateConditionTemplate
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/estimate-condition-templates", tags=["estimate-condition-templates"])


# ---------- Schemas ----------

class EstimateConditionTemplateCreate(BaseModel):
    name: str
    project_type: str | None = None
    body_html: str | None = None
    sort_order: int = 0
    is_default: bool = False


class EstimateConditionTemplateUpdate(BaseModel):
    name: str | None = None
    project_type: str | None = None
    body_html: str | None = None
    sort_order: int | None = None
    is_default: bool | None = None


# ---------- Endpoints ----------

@router.get("")
def list_templates(
    project_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """テナント内の見積条件テンプレート一覧。project_type でフィルタ可能。"""
    q = db.query(EstimateConditionTemplate).filter(
        EstimateConditionTemplate.tenant_id == user.tenant_id,
    )
    if project_type:
        q = q.filter(EstimateConditionTemplate.project_type == project_type)
    return q.order_by(
        EstimateConditionTemplate.sort_order.asc(),
        EstimateConditionTemplate.created_at.desc(),
    ).all()


@router.post("", status_code=201)
def create_template(
    body: EstimateConditionTemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """見積条件テンプレートを作成。"""
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=422, detail="テンプレート名は必須です")
    record = EstimateConditionTemplate(
        tenant_id=user.tenant_id,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{tid}")
def update_template(
    tid: str,
    body: EstimateConditionTemplateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """見積条件テンプレートを更新。"""
    record = db.query(EstimateConditionTemplate).filter(
        EstimateConditionTemplate.id == tid,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="見積条件テンプレートが見つかりません")
    if record.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="このテンプレートを操作する権限がありません")
    data = body.model_dump(exclude_unset=True)
    if "name" in data and (data["name"] is None or not str(data["name"]).strip()):
        raise HTTPException(status_code=422, detail="テンプレート名は必須です")
    for k, v in data.items():
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
    """見積条件テンプレートを削除。"""
    record = db.query(EstimateConditionTemplate).filter(
        EstimateConditionTemplate.id == tid,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="見積条件テンプレートが見つかりません")
    if record.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="このテンプレートを操作する権限がありません")
    db.delete(record)
    db.commit()
    return None
