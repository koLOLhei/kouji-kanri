"""完成図（竣工図）管理 (Completion Drawing) router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.instruction import CompletionDrawing
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/completion-drawings", tags=["completion-drawings"])


# ---------- Schemas ----------

class CompletionDrawingCreate(BaseModel):
    drawing_number: str | None = None
    title: str
    category: str
    original_drawing_id: str | None = None
    file_key: str | None = None
    notes: str | None = None


class CompletionDrawingUpdate(BaseModel):
    drawing_number: str | None = None
    title: str | None = None
    category: str | None = None
    file_key: str | None = None
    revision: int | None = None
    status: str | None = None
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_completion_drawings(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    return (
        db.query(CompletionDrawing)
        .filter(CompletionDrawing.project_id == project_id)
        .order_by(CompletionDrawing.created_at.desc())
        .all()
    )


@router.post("", status_code=201)
def create_completion_drawing(
    project_id: str,
    body: CompletionDrawingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = CompletionDrawing(project_id=project_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/progress")
def completion_drawing_progress(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    rows = db.query(CompletionDrawing).filter(CompletionDrawing.project_id == project_id).all()
    total = len(rows)
    draft = sum(1 for r in rows if r.status == "draft")
    review = sum(1 for r in rows if r.status == "review")
    approved = sum(1 for r in rows if r.status == "approved")
    return {
        "total": total,
        "draft": draft,
        "review": review,
        "approved": approved,
    }


@router.get("/{drawing_id}")
def get_completion_drawing(
    project_id: str,
    drawing_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(CompletionDrawing).filter(
        CompletionDrawing.id == drawing_id,
        CompletionDrawing.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="完成図が見つかりません")
    return record


@router.put("/{drawing_id}")
def update_completion_drawing(
    project_id: str,
    drawing_id: str,
    body: CompletionDrawingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(CompletionDrawing).filter(
        CompletionDrawing.id == drawing_id,
        CompletionDrawing.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="完成図が見つかりません")

    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    db.commit()
    db.refresh(record)
    return record
