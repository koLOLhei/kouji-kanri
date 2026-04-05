"""Comment (コメント) router - polymorphic comments on any entity."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.comment import Comment
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/comments", tags=["comments"])


# ---------- Schemas ----------

class CommentCreate(BaseModel):
    entity_type: str
    entity_id: str
    parent_comment_id: str | None = None
    body: str


class CommentUpdate(BaseModel):
    body: str


# ---------- Endpoints ----------

@router.get("")
def list_comments(
    entity_type: str,
    entity_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Comment).filter(
        Comment.tenant_id == user.tenant_id,
        Comment.entity_type == entity_type,
        Comment.entity_id == entity_id,
    ).order_by(Comment.created_at).all()


@router.post("")
def create_comment(
    req: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = Comment(
        tenant_id=user.tenant_id,
        author_id=user.id,
        author_name=user.name,
        **req.model_dump(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.put("/{comment_id}")
def update_comment(
    comment_id: str,
    req: CommentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.tenant_id == user.tenant_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="コメントが見つかりません")
    if comment.author_id != user.id:
        raise HTTPException(status_code=403, detail="自分のコメントのみ編集できます")
    comment.body = req.body
    comment.is_edited = True
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.tenant_id == user.tenant_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="コメントが見つかりません")
    if comment.author_id != user.id and user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="自分のコメントのみ削除できます")
    db.delete(comment)
    db.commit()
    return {"status": "ok"}
