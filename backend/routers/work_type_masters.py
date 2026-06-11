"""G12 工事種別マスタ API.

見積項目 (Item) 作成時に code から name / unit / 単価をプリフィルするためのマスタを
テナント単位で管理する。
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.work_type_master import WorkTypeMaster
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/work-type-masters", tags=["work-type-masters"])


# ---------- Schemas ----------

class WorkTypeMasterCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=100, description="コードは必須です")
    name: str = Field(..., min_length=1, max_length=255, description="名称は必須です")
    category: str | None = Field(default=None, max_length=100)
    default_unit: str | None = Field(default=None, max_length=50)
    default_sale_unit_price: int = Field(default=0, ge=0)
    default_cost_unit_price: int = Field(default=0, ge=0)
    is_legal_welfare_cost: bool = False
    sort_order: int = 0


class WorkTypeMasterUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=100)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    default_unit: str | None = Field(default=None, max_length=50)
    default_sale_unit_price: int | None = Field(default=None, ge=0)
    default_cost_unit_price: int | None = Field(default=None, ge=0)
    is_legal_welfare_cost: bool | None = None
    sort_order: int | None = None


def _serialize(wt: WorkTypeMaster) -> dict:
    return {
        "id": wt.id,
        "tenant_id": wt.tenant_id,
        "code": wt.code,
        "name": wt.name,
        "category": wt.category,
        "default_unit": wt.default_unit,
        "default_sale_unit_price": wt.default_sale_unit_price,
        "default_cost_unit_price": wt.default_cost_unit_price,
        "is_legal_welfare_cost": wt.is_legal_welfare_cost,
        "sort_order": wt.sort_order,
        "created_at": wt.created_at.isoformat() if wt.created_at else None,
        "updated_at": wt.updated_at.isoformat() if wt.updated_at else None,
    }


# ---------- CRUD ----------

@router.get("")
def list_work_type_masters(
    category: str | None = None,
    q: str | None = Query(default=None, description="コード/名称 部分一致"),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(WorkTypeMaster).filter(
        WorkTypeMaster.tenant_id == current_user.tenant_id
    )
    if category:
        query = query.filter(WorkTypeMaster.category == category)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (WorkTypeMaster.code.ilike(like)) | (WorkTypeMaster.name.ilike(like))
        )
    items = (
        query.order_by(WorkTypeMaster.sort_order, WorkTypeMaster.code)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {"items": [_serialize(i) for i in items], "count": len(items)}


@router.post("", status_code=201)
def create_work_type_master(
    req: WorkTypeMasterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=403, detail="テナント情報がありません")

    # コードのテナント内重複チェック
    existing = (
        db.query(WorkTypeMaster)
        .filter(
            WorkTypeMaster.tenant_id == current_user.tenant_id,
            WorkTypeMaster.code == req.code,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=422,
            detail=f"コード '{req.code}' は既に登録されています",
        )

    wt = WorkTypeMaster(
        tenant_id=current_user.tenant_id,
        **req.model_dump(),
    )
    db.add(wt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail=f"コード '{req.code}' は既に登録されています",
        )
    db.refresh(wt)
    return _serialize(wt)


@router.put("/{wid}")
def update_work_type_master(
    wid: str,
    req: WorkTypeMasterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wt = db.query(WorkTypeMaster).filter(WorkTypeMaster.id == wid).first()
    if not wt:
        raise HTTPException(status_code=404, detail="工事種別マスタが見つかりません")
    if wt.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="このマスタへのアクセス権がありません")

    updates = req.model_dump(exclude_unset=True)

    # code を変更する場合はテナント内重複チェック
    if "code" in updates and updates["code"] is not None and updates["code"] != wt.code:
        dup = (
            db.query(WorkTypeMaster)
            .filter(
                WorkTypeMaster.tenant_id == current_user.tenant_id,
                WorkTypeMaster.code == updates["code"],
                WorkTypeMaster.id != wid,
            )
            .first()
        )
        if dup:
            raise HTTPException(
                status_code=422,
                detail=f"コード '{updates['code']}' は既に登録されています",
            )

    for k, v in updates.items():
        setattr(wt, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="保存に失敗しました（重複の可能性）")
    db.refresh(wt)
    return _serialize(wt)


@router.delete("/{wid}")
def delete_work_type_master(
    wid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wt = db.query(WorkTypeMaster).filter(WorkTypeMaster.id == wid).first()
    if not wt:
        raise HTTPException(status_code=404, detail="工事種別マスタが見つかりません")
    if wt.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="このマスタへのアクセス権がありません")

    db.delete(wt)
    db.commit()
    return {"status": "ok"}
