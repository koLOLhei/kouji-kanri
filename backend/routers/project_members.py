"""プロジェクトメンバー管理API — プロジェクト単位のアクセス制御"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.project_member import ProjectMember
from models.user import User
from services.auth_service import get_current_user, require_role

router = APIRouter(
    prefix="/api/projects/{project_id}/members",
    tags=["project-members"],
)


# ── スキーマ ─────────────────────────────────────────────────────────────────

class AddMemberRequest(BaseModel):
    user_id: str
    role: str = "member"  # manager, member, viewer


class MemberResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    user_name: str | None = None
    user_email: str | None = None
    role: str
    added_at: datetime


# ── エンドポイント ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[MemberResponse])
def list_members(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトのメンバー一覧"""
    # プロジェクトがテナント内に存在するか確認
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
    ).order_by(ProjectMember.added_at.asc()).all()

    result = []
    for m in members:
        member_user = db.query(User).filter(User.id == m.user_id).first()
        result.append(MemberResponse(
            id=m.id,
            project_id=m.project_id,
            user_id=m.user_id,
            user_name=member_user.name if member_user else None,
            user_email=member_user.email if member_user else None,
            role=m.role,
            added_at=m.added_at,
        ))
    return result


@router.post("", response_model=MemberResponse, status_code=201)
def add_member(
    project_id: str,
    req: AddMemberRequest,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """プロジェクトにメンバーを追加（admin権限必須）"""
    # プロジェクト確認
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    # ロール検証
    valid_roles = {"manager", "member", "viewer"}
    if req.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"無効なロール: {req.role}。有効値: {sorted(valid_roles)}",
        )

    # 追加対象ユーザーが同じテナント内に存在するか確認
    target_user = db.query(User).filter(
        User.id == req.user_id,
        User.tenant_id == user.tenant_id,
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # 重複チェック
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == req.user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="すでにメンバーとして登録されています")

    member = ProjectMember(
        project_id=project_id,
        user_id=req.user_id,
        role=req.role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return MemberResponse(
        id=member.id,
        project_id=member.project_id,
        user_id=member.user_id,
        user_name=target_user.name,
        user_email=target_user.email,
        role=member.role,
        added_at=member.added_at,
    )


@router.delete("/{member_id}")
def remove_member(
    project_id: str,
    member_id: str,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """プロジェクトからメンバーを削除（admin権限必須）"""
    # プロジェクト確認
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    member = db.query(ProjectMember).filter(
        ProjectMember.id == member_id,
        ProjectMember.project_id == project_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    db.delete(member)
    db.commit()
    return {"status": "deleted", "member_id": member_id}
