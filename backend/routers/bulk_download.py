"""Bulk download (一括ダウンロード) router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.submission import Submission
from models.user import User
from services.auth_service import get_current_user
from services.storage_service import generate_presigned_url

router = APIRouter(prefix="/api/projects/{project_id}/bulk-download", tags=["bulk-download"])


# ---------- Schemas ----------

class BulkDownloadRequest(BaseModel):
    submission_ids: list[str]


# ---------- Endpoints ----------

@router.get("/list")
def list_downloadable_documents(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns list of all downloadable documents (submissions with file_key)."""
    submissions = (
        db.query(Submission)
        .filter(
            Submission.project_id == project_id,
            Submission.file_key.isnot(None),
            Submission.file_key != "",
        )
        .order_by(Submission.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "title": getattr(s, "title", None) or getattr(s, "submission_type", "") or s.id,
            "file_key": s.file_key,
            "created_at": s.created_at,
        }
        for s in submissions
    ]


@router.post("")
def bulk_download(
    project_id: str,
    req: BulkDownloadRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate presigned download URLs for the requested submissions."""
    if not req.submission_ids:
        raise HTTPException(status_code=400, detail="submission_ids が空です")

    submissions = (
        db.query(Submission)
        .filter(
            Submission.id.in_(req.submission_ids),
            Submission.project_id == project_id,
            Submission.file_key.isnot(None),
            Submission.file_key != "",
        )
        .all()
    )

    if not submissions:
        raise HTTPException(status_code=404, detail="ダウンロード可能な書類が見つかりません")

    result = []
    for s in submissions:
        title = getattr(s, "title", None) or getattr(s, "submission_type", "") or s.id
        try:
            url = generate_presigned_url(s.file_key)
        except Exception:
            url = None
        result.append({
            "id": s.id,
            "title": title,
            "download_url": url,
        })

    return result
