"""Tenant plan enforcement service.

Plan limits:
  free:       3 projects,  5 users
  standard:  20 projects, 30 users
  enterprise: unlimited   (represented as None / very large number)
"""

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.tenant import Tenant
from models.project import Project
from models.user import User

# ---------------------------------------------------------------------------
# Plan definitions
# ---------------------------------------------------------------------------

PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "free": {
        "max_projects": 3,
        "max_users": 5,
    },
    "standard": {
        "max_projects": 20,
        "max_users": 30,
    },
    "enterprise": {
        "max_projects": None,   # unlimited
        "max_users": None,      # unlimited
    },
}

_UNLIMITED = 999_999


def _get_limit(plan: str, key: str) -> int:
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["standard"])
    val = limits.get(key)
    return _UNLIMITED if val is None else val


# ---------------------------------------------------------------------------
# Check helpers
# ---------------------------------------------------------------------------

def get_tenant_or_404(db: Session, tenant_id: str) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_active == True).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")
    return tenant


def check_project_limit(db: Session, tenant_id: str) -> None:
    """Raise 403 if the tenant has reached its project limit."""
    tenant = get_tenant_or_404(db, tenant_id)

    # Prefer the tenant's own stored max (set at signup / plan change),
    # but cross-check with plan definition for correctness.
    plan_max = _get_limit(tenant.plan, "max_projects")
    effective_max = min(tenant.max_projects, plan_max)

    current = (
        db.query(func.count(Project.id))
        .filter(Project.tenant_id == tenant_id, Project.status != "deleted")
        .scalar()
        or 0
    )

    if current >= effective_max:
        raise HTTPException(
            status_code=403,
            detail=(
                f"プランの案件数上限 ({effective_max}件) に達しました。"
                " プランをアップグレードしてください。"
            ),
        )


def check_user_limit(db: Session, tenant_id: str) -> None:
    """Raise 403 if the tenant has reached its user limit."""
    tenant = get_tenant_or_404(db, tenant_id)

    plan_max = _get_limit(tenant.plan, "max_users")
    effective_max = min(tenant.max_users, plan_max)

    current = (
        db.query(func.count(User.id))
        .filter(User.tenant_id == tenant_id, User.is_active == True)
        .scalar()
        or 0
    )

    if current >= effective_max:
        raise HTTPException(
            status_code=403,
            detail=(
                f"プランのユーザー数上限 ({effective_max}人) に達しました。"
                " プランをアップグレードしてください。"
            ),
        )


def get_plan_usage(db: Session, tenant_id: str) -> dict:
    """Return current usage vs limits for a tenant."""
    tenant = get_tenant_or_404(db, tenant_id)

    plan_max_projects = _get_limit(tenant.plan, "max_projects")
    plan_max_users = _get_limit(tenant.plan, "max_users")
    effective_max_projects = min(tenant.max_projects, plan_max_projects)
    effective_max_users = min(tenant.max_users, plan_max_users)

    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.tenant_id == tenant_id, Project.status != "deleted")
        .scalar()
        or 0
    )
    user_count = (
        db.query(func.count(User.id))
        .filter(User.tenant_id == tenant_id, User.is_active == True)
        .scalar()
        or 0
    )

    return {
        "plan": tenant.plan,
        "projects": {
            "current": project_count,
            "limit": effective_max_projects if effective_max_projects < _UNLIMITED else None,
            "is_unlimited": effective_max_projects >= _UNLIMITED,
            "remaining": max(0, effective_max_projects - project_count) if effective_max_projects < _UNLIMITED else None,
        },
        "users": {
            "current": user_count,
            "limit": effective_max_users if effective_max_users < _UNLIMITED else None,
            "is_unlimited": effective_max_users >= _UNLIMITED,
            "remaining": max(0, effective_max_users - user_count) if effective_max_users < _UNLIMITED else None,
        },
    }


def sync_tenant_limits_from_plan(db: Session, tenant: Tenant) -> None:
    """Update a tenant's stored max_projects/max_users to match their plan definition."""
    limits = PLAN_LIMITS.get(tenant.plan, PLAN_LIMITS["standard"])
    if limits["max_projects"] is not None:
        tenant.max_projects = limits["max_projects"]
    else:
        tenant.max_projects = _UNLIMITED
    if limits["max_users"] is not None:
        tenant.max_users = limits["max_users"]
    else:
        tenant.max_users = _UNLIMITED
    db.commit()
