"""Comment (コメント) router - polymorphic comments on any entity."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.comment import Comment
from models.user import User
from models.project import Project
from models.daily_report import DailyReport
from models.phase import Phase
from models.inspection import Inspection
from models.drawing import Drawing
from models.corrective_action import CorrectiveAction
from models.meeting import Meeting
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/comments", tags=["comments"])


# ---------- Helpers ----------

def _verify_entity_ownership(entity_type: str, entity_id: str, tenant_id: str, db: Session) -> None:
    """Verify that the target entity exists and belongs to the user's tenant."""
    obj = None
    if entity_type == "project":
        obj = db.query(Project).filter(Project.id == entity_id, Project.tenant_id == tenant_id).first()
    elif entity_type == "daily_report":
        obj = (
            db.query(DailyReport)
            .join(Project, Project.id == DailyReport.project_id)
            .filter(DailyReport.id == entity_id, Project.tenant_id == tenant_id)
            .first()
        )
    elif entity_type == "phase":
        obj = (
            db.query(Phase)
            .join(Project, Project.id == Phase.project_id)
            .filter(Phase.id == entity_id, Project.tenant_id == tenant_id)
            .first()
        )
    elif entity_type == "inspection":
        obj = (
            db.query(Inspection)
            .join(Project, Project.id == Inspection.project_id)
            .filter(Inspection.id == entity_id, Project.tenant_id == tenant_id)
            .first()
        )
    elif entity_type == "drawing":
        obj = (
            db.query(Drawing)
            .join(Project, Project.id == Drawing.project_id)
            .filter(Drawing.id == entity_id, Project.tenant_id == tenant_id)
            .first()
        )
    elif entity_type == "corrective_action":
        obj = (
            db.query(CorrectiveAction)
            .join(Project, Project.id == CorrectiveAction.project_id)
            .filter(CorrectiveAction.id == entity_id, Project.tenant_id == tenant_id)
            .first()
        )
    elif entity_type == "meeting":
        obj = (
            db.query(Meeting)
            .join(Project, Project.id == Meeting.project_id)
            .filter(Meeting.id == entity_id, Project.tenant_id == tenant_id)
            .first()
        )
    else:
        # For unknown entity types, deny access to prevent enumeration attacks
        raise HTTPException(status_code=400, detail=f"サポートされていないエンティティタイプ: {entity_type}")
    if not obj:
        raise HTTPException(status_code=404, detail="エンティティが見つかりません")


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
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Comment).filter(
        Comment.tenant_id == user.tenant_id,
        Comment.entity_type == entity_type,
        Comment.entity_id == entity_id,
    ).order_by(Comment.created_at).offset(offset).limit(limit).all()


@router.post("")
def create_comment(
    req: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_entity_ownership(req.entity_type, req.entity_id, user.tenant_id, db)
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
