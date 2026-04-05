"""Tenant management router (super_admin / admin)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text, func
from sqlalchemy.orm import Session

from database import get_db, Base, engine
from models.tenant import Tenant
from models.user import User
from models.project import Project
from services.auth_service import get_current_user, require_role, hash_password
from services.plan_service import check_user_limit, sync_tenant_limits_from_plan, get_plan_usage
from services.seed import seed_spec_chapters_for_schema

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


# --- Schemas ---

class TenantCreate(BaseModel):
    name: str  # 会社名
    slug: str  # URL識別子
    plan: str = "standard"  # free, standard, enterprise
    max_projects: int = 10
    max_users: int = 20
    admin_email: str
    admin_password: str
    admin_name: str


class TenantUpdate(BaseModel):
    name: str | None = None
    plan: str | None = None
    is_active: bool | None = None
    max_projects: int | None = None
    max_users: int | None = None


class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    schema_name: str
    plan: str
    is_active: bool
    max_projects: int
    max_users: int
    created_at: datetime
    updated_at: datetime
    user_count: int | None = None
    project_count: int | None = None

    class Config:
        from_attributes = True


class TenantUserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "worker"  # admin, project_manager, worker, inspector


class TenantUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    tenant_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PlanInfo(BaseModel):
    code: str
    name: str
    max_projects: int
    max_users: int
    price_monthly: int
    features: list[str]


# --- Plan Definitions ---

PLANS = [
    PlanInfo(
        code="free", name="フリー", max_projects=3, max_users=5,
        price_monthly=0,
        features=["案件管理 3件まで", "写真アップロード", "基本書類生成"],
    ),
    PlanInfo(
        code="standard", name="スタンダード", max_projects=20, max_users=30,
        price_monthly=29800,
        features=["案件管理 20件", "写真アップロード無制限", "全書類テンプレート", "地域仕様対応", "メールサポート"],
    ),
    PlanInfo(
        code="enterprise", name="エンタープライズ", max_projects=999, max_users=999,
        price_monthly=98000,
        features=["案件管理 無制限", "全機能", "カスタムテンプレート", "API連携", "専任サポート", "SLA保証"],
    ),
]


# --- Endpoints ---

@router.get("/plans", response_model=list[PlanInfo])
def list_plans():
    """利用可能なプラン一覧"""
    return PLANS


@router.get("", response_model=list[TenantResponse])
def list_tenants(
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    result = []
    for t in tenants:
        resp = TenantResponse.model_validate(t)
        resp.user_count = db.query(func.count(User.id)).filter(User.tenant_id == t.id).scalar()
        resp.project_count = db.query(func.count(Project.id)).filter(Project.tenant_id == t.id).scalar()
        result.append(resp)
    return result


@router.post("", response_model=TenantResponse)
def create_tenant(
    req: TenantCreate,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    """新規テナント作成（会社登録）"""
    # slug重複チェック
    existing = db.query(Tenant).filter(Tenant.slug == req.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"スラッグ '{req.slug}' は既に使用されています")

    schema_name = f"tenant_{req.slug}"

    # テナントレコード作成
    tenant = Tenant(
        name=req.name,
        slug=req.slug,
        schema_name=schema_name,
        plan=req.plan,
        max_projects=req.max_projects,
        max_users=req.max_users,
    )
    db.add(tenant)
    db.flush()

    # 管理者ユーザー作成
    admin_user = User(
        tenant_id=tenant.id,
        email=req.admin_email,
        password_hash=hash_password(req.admin_password),
        name=req.admin_name,
        role="admin",
    )
    db.add(admin_user)
    db.commit()
    db.refresh(tenant)

    resp = TenantResponse.model_validate(tenant)
    resp.user_count = 1
    resp.project_count = 0
    return resp


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: str,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")
    resp = TenantResponse.model_validate(tenant)
    resp.user_count = db.query(func.count(User.id)).filter(User.tenant_id == tenant.id).scalar()
    resp.project_count = db.query(func.count(Project.id)).filter(Project.tenant_id == tenant.id).scalar()
    return resp


@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str,
    req: TenantUpdate,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")

    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(tenant, key, value)

    # プラン変更時はlimitsも更新（plan_service経由で正規値に同期）
    if req.plan:
        sync_tenant_limits_from_plan(db, tenant)
        # Re-apply any explicit override from the request
        if req.max_projects is not None:
            tenant.max_projects = req.max_projects
        if req.max_users is not None:
            tenant.max_users = req.max_users

    db.commit()
    db.refresh(tenant)
    return TenantResponse.model_validate(tenant)


@router.delete("/{tenant_id}")
def deactivate_tenant(
    tenant_id: str,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")
    tenant.is_active = False
    db.commit()
    return {"status": "ok", "message": f"テナント '{tenant.name}' を無効化しました"}


# --- Tenant Users ---

@router.get("/{tenant_id}/users", response_model=list[TenantUserResponse])
def list_tenant_users(
    tenant_id: str,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(User.tenant_id == tenant_id).order_by(User.created_at).all()
    return [TenantUserResponse.model_validate(u) for u in users]


@router.post("/{tenant_id}/users", response_model=TenantUserResponse)
def add_tenant_user(
    tenant_id: str,
    req: TenantUserCreate,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")

    # ユーザー数上限チェック（plan_service経由）
    check_user_limit(db, tenant_id)

    # メール重複チェック
    existing = db.query(User).filter(User.tenant_id == tenant_id, User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    new_user = User(
        tenant_id=tenant_id,
        email=req.email,
        password_hash=hash_password(req.password),
        name=req.name,
        role=req.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return TenantUserResponse.model_validate(new_user)


@router.put("/{tenant_id}/users/{user_id}")
def update_tenant_user(
    tenant_id: str,
    user_id: str,
    req: TenantUserCreate,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    target.email = req.email
    target.name = req.name
    target.role = req.role
    if req.password:
        target.password_hash = hash_password(req.password)
    db.commit()
    return {"status": "ok"}


@router.delete("/{tenant_id}/users/{user_id}")
def deactivate_tenant_user(
    tenant_id: str,
    user_id: str,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    target.is_active = False
    db.commit()
    return {"status": "ok"}


# --- Plan Usage ---

@router.get("/{tenant_id}/plan-usage")
def get_plan_usage_endpoint(
    tenant_id: str,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    """テナントのプラン使用状況（案件数・ユーザー数と上限）"""
    return get_plan_usage(db, tenant_id)


# --- Stats ---

@router.get("/stats/overview")
def get_stats(
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    """SaaS全体の統計"""
    total_tenants = db.query(func.count(Tenant.id)).scalar()
    active_tenants = db.query(func.count(Tenant.id)).filter(Tenant.is_active == True).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_projects = db.query(func.count(Project.id)).scalar()

    # プラン別テナント数
    plan_breakdown = {}
    for plan in PLANS:
        count = db.query(func.count(Tenant.id)).filter(Tenant.plan == plan.code).scalar()
        plan_breakdown[plan.code] = {"name": plan.name, "count": count, "price": plan.price_monthly}

    # 月次推定収益
    monthly_revenue = sum(
        plan_breakdown[p.code]["count"] * p.price_monthly for p in PLANS
    )

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_users": total_users,
        "total_projects": total_projects,
        "plan_breakdown": plan_breakdown,
        "monthly_revenue": monthly_revenue,
    }
