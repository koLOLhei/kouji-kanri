"""Fine-grained role-permission system for 工事管理SaaS."""

from enum import Enum
from typing import Set

from fastapi import Depends, HTTPException, status

from models.user import User
from services.auth_service import get_current_user


class Permission(str, Enum):
    VIEW = "view"
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    APPROVE = "approve"
    ADMIN = "admin"


# All roles (existing + new)
ROLE_LABELS = {
    "super_admin": "スーパー管理者",
    "admin": "管理者",
    "project_manager": "プロジェクト管理者",
    "site_manager": "現場所長",
    "chief_engineer": "主任技術者",
    "safety_manager": "安全管理者",
    "quality_manager": "品質管理者",
    "office_staff": "事務",
    "worker": "作業員",
    "inspector": "検査員",
    "viewer": "閲覧専用",
}

# Role -> set of permissions
ROLE_PERMISSIONS: dict[str, Set[Permission]] = {
    "super_admin": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
        Permission.DELETE,
        Permission.APPROVE,
        Permission.ADMIN,
    },
    "admin": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
        Permission.DELETE,
        Permission.APPROVE,
        Permission.ADMIN,
    },
    "project_manager": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
        Permission.DELETE,
        Permission.APPROVE,
    },
    "site_manager": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
        Permission.APPROVE,
    },
    "chief_engineer": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
        Permission.APPROVE,
    },
    "safety_manager": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
    },
    "quality_manager": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
        Permission.APPROVE,
    },
    "office_staff": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
    },
    "worker": {
        Permission.VIEW,
        Permission.CREATE,
    },
    "inspector": {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
        Permission.APPROVE,
    },
    "viewer": {
        Permission.VIEW,
    },
}


def get_permissions_for_role(role: str) -> Set[Permission]:
    """Return the set of permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: str, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in get_permissions_for_role(role)


def require_permission(*permissions: Permission):
    """FastAPI dependency: require that the current user has ALL listed permissions."""
    def check(user: User = Depends(get_current_user)) -> User:
        user_permissions = get_permissions_for_role(user.role)
        missing = [p for p in permissions if p not in user_permissions]
        if missing:
            missing_labels = ", ".join(m.value for m in missing)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"権限がありません。必要な権限: {missing_labels}",
            )
        return user
    return check


def require_any_permission(*permissions: Permission):
    """FastAPI dependency: require that the current user has AT LEAST ONE of the listed permissions."""
    def check(user: User = Depends(get_current_user)) -> User:
        user_permissions = get_permissions_for_role(user.role)
        if not any(p in user_permissions for p in permissions):
            labels = ", ".join(p.value for p in permissions)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"権限がありません。必要な権限のいずれか: {labels}",
            )
        return user
    return check


def require_role_or_permission(*roles: str, permission: Permission | None = None):
    """FastAPI dependency: require role membership OR permission."""
    def check(user: User = Depends(get_current_user)) -> User:
        if user.role in roles:
            return user
        if permission and has_permission(user.role, permission):
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="権限がありません",
        )
    return check
