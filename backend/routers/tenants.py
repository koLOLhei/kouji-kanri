"""Tenant management router (super_admin / admin)."""

import hashlib
import secrets
import time
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
    user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    # Batch count (N+1回避)
    tenant_ids = [t.id for t in tenants]
    user_counts = dict(db.query(User.tenant_id, func.count(User.id)).filter(
        User.tenant_id.in_(tenant_ids)).group_by(User.tenant_id).all())
    project_counts = dict(db.query(Project.tenant_id, func.count(Project.id)).filter(
        Project.tenant_id.in_(tenant_ids)).group_by(Project.tenant_id).all())

    result = []
    for t in tenants:
        resp = TenantResponse.model_validate(t)
        resp.user_count = user_counts.get(t.id, 0)
        resp.project_count = project_counts.get(t.id, 0)
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

    # 一般adminは自社テナントの名前のみ変更可。プラン・上限はsuper_admin専用。
    if user.role != "super_admin":
        if tenant.id != user.tenant_id:
            raise HTTPException(status_code=403, detail="他社テナントは変更できません")
        if req.plan is not None or req.max_projects is not None or req.max_users is not None or req.is_active is not None:
            raise HTTPException(status_code=403, detail="プラン・上限の変更はシステム管理者のみ可能です")

    data = req.model_dump(exclude_unset=True)
    # super_admin以外はmax_projects/max_usersを変更不可（二重防御）
    if user.role != "super_admin":
        data.pop("max_projects", None)
        data.pop("max_users", None)
        data.pop("plan", None)
        data.pop("is_active", None)

    for key, value in data.items():
        setattr(tenant, key, value)

    # プラン変更時はlimitsも更新（super_adminのみ到達可能）
    if req.plan and user.role == "super_admin":
        sync_tenant_limits_from_plan(db, tenant)

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
    if target.role != req.role:
        # Role change invalidates existing tokens
        target.token_version = (target.token_version or 0) + 1
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
    # Deactivation invalidates existing tokens
    target.token_version = (target.token_version or 0) + 1
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
    user: User = Depends(require_role("super_admin")),
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


# ── D30: User invitation (DB永続化) ───────────────────────────────────────────

from models.invite_token import InviteToken
_INVITE_TOKEN_TTL = 86400  # 24 hours


class InviteRequest(BaseModel):
    role: str = "worker"
    email: str = ""  # 招待メール送信先（任意）


@router.post("/{tenant_id}/invite")
def invite_user(
    tenant_id: str,
    req: InviteRequest,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    """招待リンクを生成してDBに永続化。複数台構成でも正常動作。"""
    # adminは自社テナントのみ招待可能
    if user.role != "super_admin" and tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="他社テナントへの招待はできません")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")

    allowed_roles = {"admin", "project_manager", "worker", "inspector"}
    if req.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"無効なロールです。許可値: {', '.join(allowed_roles)}")

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    from services.timezone_utils import now_utc
    from datetime import timedelta
    invite = InviteToken(
        token_hash=token_hash,
        tenant_id=tenant_id,
        role=req.role,
        email=req.email or None,
        expires_at=now_utc() + timedelta(seconds=_INVITE_TOKEN_TTL),
    )
    db.add(invite)
    db.commit()

    # メール送信（トークンをログに出力しない）
    from services.email_service import send_email
    invite_url = f"https://kouji.soara-mu.jp/accept-invite?token={raw_token}"
    if req.email:
        send_email(
            req.email,
            f"[KAMO] {tenant.name}への招待",
            f"<p>{tenant.name}に招待されました。</p><p><a href='{invite_url}'>こちらからアカウントを作成</a>（24時間有効）</p>",
        )

    return {
        "invite_url": invite_url,
        "expires_in_seconds": _INVITE_TOKEN_TTL,
        "message": "招待リンクを生成しました。",
    }


class AcceptInviteRequest(BaseModel):
    token: str
    email: str
    name: str
    password: str


@router.post("/accept-invite", response_model=TenantUserResponse)
def accept_invite(req: AcceptInviteRequest, db: Session = Depends(get_db)):
    """招待トークンを検証してユーザーアカウントを作成（DB永続化版）。"""
    token_hash = hashlib.sha256(req.token.encode()).hexdigest()

    from services.timezone_utils import now_utc
    invite = db.query(InviteToken).filter(
        InviteToken.token_hash == token_hash,
        InviteToken.used == False,
        InviteToken.expires_at > now_utc(),
    ).first()
    if not invite:
        raise HTTPException(status_code=400, detail="無効または期限切れの招待トークンです")

    check_user_limit(db, invite.tenant_id)

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="パスワードは8文字以上にしてください")

    new_user = User(
        tenant_id=invite.tenant_id,
        email=req.email,
        password_hash=hash_password(req.password),
        name=req.name,
        role=invite.role,
    )
    db.add(new_user)
    invite.used = True  # トークンを使用済みにする（削除ではなく監査証跡として残す）
    db.commit()
    db.refresh(new_user)
    return TenantUserResponse.model_validate(new_user)
