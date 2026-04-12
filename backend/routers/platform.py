"""プラットフォーム機能: パスワードリセット、ログイン履歴、汎用ファイル、招待"""

import asyncio
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.platform import PasswordResetToken, LoginHistory, FileAttachment, UserInvitation
from models.user import User
from services.auth_service import get_current_user, require_role, hash_password
from services.storage_service import upload_file, generate_upload_key, generate_presigned_url
from services.project_access import verify_project_access

router = APIRouter(tags=["platform"])


# ─── パスワードリセット ───

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

@router.post("/api/auth/password-reset/request")
def request_password_reset(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """パスワードリセット要求（メール送信はdev_mode）"""
    user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
    if not user:
        return {"status": "ok"}  # セキュリティ: ユーザーの存在を漏らさない
    token = PasswordResetToken(
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(token)
    db.commit()
    # メール送信（dev_mode）
    from services.email_service import send_email
    send_email([req.email], "パスワードリセット",
        f"<p>以下のトークンでパスワードをリセットしてください:</p><p><code>{token.token}</code></p>")
    return {"status": "ok"}

@router.post("/api/auth/password-reset/confirm")
def confirm_password_reset(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    """トークンで新しいパスワードを設定"""
    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == req.token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.now(timezone.utc),
    ).first()
    if not token:
        raise HTTPException(status_code=400, detail="無効または期限切れのトークンです")
    user = db.query(User).filter(User.id == token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    user.password_hash = hash_password(req.new_password)
    token.used = True
    db.commit()
    return {"status": "ok", "message": "パスワードを変更しました"}


# ─── ログイン履歴 ───

@router.get("/api/auth/login-history")
def get_login_history(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = db.query(LoginHistory).filter(
        LoginHistory.user_id == user.id
    ).order_by(LoginHistory.login_at.desc()).limit(limit).all()
    return [
        {
            "login_at": r.login_at.isoformat() if r.login_at else None,
            "ip_address": r.ip_address,
            "success": r.success,
        }
        for r in records
    ]


# ─── 汎用ファイル添付 ───

@router.get("/api/projects/{project_id}/files")
def list_files(
    project_id: str,
    entity_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(FileAttachment).filter(FileAttachment.project_id == project_id)
    if entity_type:
        q = q.filter(FileAttachment.entity_type == entity_type)
    files = q.order_by(FileAttachment.created_at.desc()).all()
    return [
        {
            "id": f.id, "original_filename": f.original_filename,
            "file_size": f.file_size, "mime_type": f.mime_type,
            "description": f.description, "entity_type": f.entity_type,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "download_url": generate_presigned_url(f.file_key),
        }
        for f in files
    ]

@router.post("/api/projects/{project_id}/files")
async def upload_file_attachment(
    project_id: str,
    file: UploadFile = File(...),
    description: str | None = Form(None),
    entity_type: str | None = Form(None),
    entity_id: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    data = await file.read()
    key = generate_upload_key(user.tenant_id, project_id, "files", file.filename or "file")
    # upload_file はブロッキングI/O → スレッドプールで実行
    await asyncio.to_thread(upload_file, data, key, file.content_type or "application/octet-stream")
    attachment = FileAttachment(
        tenant_id=user.tenant_id, project_id=project_id,
        entity_type=entity_type, entity_id=entity_id,
        file_key=key, original_filename=file.filename or "file",
        file_size=len(data), mime_type=file.content_type,
        description=description, uploaded_by=user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return {"id": attachment.id, "filename": attachment.original_filename, "size": attachment.file_size}

@router.delete("/api/projects/{project_id}/files/{file_id}")
def delete_file_attachment(
    project_id: str, file_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    f = db.query(FileAttachment).filter(FileAttachment.id == file_id, FileAttachment.project_id == project_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    db.delete(f)
    db.commit()
    return {"status": "ok"}


# ─── ユーザー招待 ───

class InviteRequest(BaseModel):
    email: str
    role: str = "worker"

@router.post("/api/invitations")
def invite_user(
    req: InviteRequest,
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """ユーザーを招待（メール送信はdev_mode）"""
    existing = db.query(User).filter(User.email == req.email, User.tenant_id == user.tenant_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    invitation = UserInvitation(
        tenant_id=user.tenant_id, email=req.email, role=req.role,
        invited_by=user.id, expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)
    db.commit()
    from services.email_service import send_email
    send_email([req.email], "工事管理SaaSへの招待",
        f"<p>{user.name}があなたを招待しました。</p><p>招待コード: <code>{invitation.token}</code></p>")
    return {"status": "ok", "invitation_id": invitation.id, "token": invitation.token}

@router.get("/api/users")
def list_tenant_users(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """テナント内のユーザー一覧"""
    users = db.query(User).filter(User.tenant_id == user.tenant_id, User.is_active == True).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in users]


@router.get("/api/invitations")
def list_invitations(
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return db.query(UserInvitation).filter(
        UserInvitation.tenant_id == user.tenant_id
    ).order_by(UserInvitation.created_at.desc()).all()
