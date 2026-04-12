"""Drawing (図面) management router with revision history and approval workflow."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.drawing import Drawing, DrawingRevision
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.storage_service import delete_file

router = APIRouter(prefix="/api/projects/{project_id}/drawings", tags=["drawings"])


# ---------- Schemas ----------

class DrawingCreate(BaseModel):
    drawing_number: str | None = None
    title: str
    category: str
    drawing_category: str | None = None  # "design", "construction", "shop"
    file_key: str
    file_size: int | None = None
    change_description: str | None = None


class DrawingUpdate(BaseModel):
    drawing_number: str | None = None
    title: str | None = None
    category: str | None = None
    drawing_category: str | None = None
    status: str | None = None


class ApprovalRejectBody(BaseModel):
    rejection_reason: str | None = None


class RevisionCreate(BaseModel):
    file_key: str
    thumbnail_key: str | None = None
    file_size: int | None = None
    change_description: str | None = None


# ---------- Drawings ----------

@router.get("")
def list_drawings(
    project_id: str,
    category: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(Drawing).filter(Drawing.project_id == project_id)
    if category:
        q = q.filter(Drawing.category == category)
    return q.order_by(Drawing.drawing_number).all()


@router.post("")
def create_drawing(
    project_id: str,
    req: DrawingCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    drawing = Drawing(
        project_id=project_id,
        drawing_number=req.drawing_number,
        title=req.title,
        category=req.category,
        drawing_category=req.drawing_category,
        current_revision=1,
        created_by=user.id,
    )
    db.add(drawing)
    db.flush()
    rev = DrawingRevision(
        drawing_id=drawing.id,
        revision_number=1,
        file_key=req.file_key,
        file_size=req.file_size,
        change_description=req.change_description or "初版",
        uploaded_by=user.id,
    )
    db.add(rev)
    db.commit()
    db.refresh(drawing)
    return drawing


@router.get("/{drawing_id}")
def get_drawing(
    project_id: str, drawing_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    drawing = db.query(Drawing).filter(
        Drawing.id == drawing_id, Drawing.project_id == project_id
    ).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="図面が見つかりません")
    revisions = db.query(DrawingRevision).filter(
        DrawingRevision.drawing_id == drawing_id
    ).order_by(DrawingRevision.revision_number.desc()).all()
    return {"drawing": drawing, "revisions": revisions}


@router.put("/{drawing_id}")
def update_drawing(
    project_id: str, drawing_id: str, req: DrawingUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    drawing = db.query(Drawing).filter(
        Drawing.id == drawing_id, Drawing.project_id == project_id
    ).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="図面が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(drawing, k, v)
    db.commit()
    db.refresh(drawing)
    return drawing


@router.delete("/{drawing_id}")
def delete_drawing(
    project_id: str, drawing_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    drawing = db.query(Drawing).filter(
        Drawing.id == drawing_id, Drawing.project_id == project_id
    ).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="図面が見つかりません")
    # Delete all revision files from storage before removing DB records
    revisions = db.query(DrawingRevision).filter(DrawingRevision.drawing_id == drawing_id).all()
    for rev in revisions:
        if rev.file_key:
            delete_file(rev.file_key)
        if rev.thumbnail_key:
            delete_file(rev.thumbnail_key)
    db.query(DrawingRevision).filter(DrawingRevision.drawing_id == drawing_id).delete()
    db.delete(drawing)
    db.commit()
    return {"status": "ok"}


# ---------- Approval Workflow ----------

@router.put("/{drawing_id}/submit-for-approval")
def submit_for_approval(
    project_id: str, drawing_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    drawing = db.query(Drawing).filter(
        Drawing.id == drawing_id, Drawing.project_id == project_id
    ).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="図面が見つかりません")
    if drawing.approval_status not in ("draft", "rejected"):
        raise HTTPException(status_code=400, detail=f"承認申請できない状態です: {drawing.approval_status}")
    drawing.approval_status = "submitted"
    drawing.rejection_reason = None
    db.commit()
    db.refresh(drawing)
    return drawing


@router.put("/{drawing_id}/approve")
def approve_drawing(
    project_id: str, drawing_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    drawing = db.query(Drawing).filter(
        Drawing.id == drawing_id, Drawing.project_id == project_id
    ).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="図面が見つかりません")
    if drawing.approval_status != "submitted":
        raise HTTPException(status_code=400, detail="承認申請中の図面のみ承認できます")
    drawing.approval_status = "approved"
    drawing.approved_by = user.id
    drawing.approved_at = datetime.utcnow()
    drawing.rejection_reason = None
    db.commit()
    db.refresh(drawing)
    return drawing


@router.put("/{drawing_id}/reject")
def reject_drawing(
    project_id: str, drawing_id: str,
    req: ApprovalRejectBody,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    drawing = db.query(Drawing).filter(
        Drawing.id == drawing_id, Drawing.project_id == project_id
    ).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="図面が見つかりません")
    if drawing.approval_status != "submitted":
        raise HTTPException(status_code=400, detail="承認申請中の図面のみ却下できます")
    drawing.approval_status = "rejected"
    drawing.rejection_reason = req.rejection_reason
    db.commit()
    db.refresh(drawing)
    return drawing


# ---------- Revisions ----------

@router.get("/{drawing_id}/revisions")
def list_revisions(
    project_id: str, drawing_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(DrawingRevision).filter(
        DrawingRevision.drawing_id == drawing_id
    ).order_by(DrawingRevision.revision_number.desc()).all()


@router.post("/{drawing_id}/revisions")
def create_revision(
    project_id: str, drawing_id: str, req: RevisionCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    drawing = db.query(Drawing).filter(
        Drawing.id == drawing_id, Drawing.project_id == project_id
    ).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="図面が見つかりません")
    new_rev_num = drawing.current_revision + 1
    rev = DrawingRevision(
        drawing_id=drawing_id,
        revision_number=new_rev_num,
        file_key=req.file_key,
        thumbnail_key=req.thumbnail_key,
        file_size=req.file_size,
        change_description=req.change_description,
        uploaded_by=user.id,
    )
    db.add(rev)
    drawing.current_revision = new_rev_num
    db.commit()
    db.refresh(rev)
    return rev
