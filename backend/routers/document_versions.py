"""Document version management router."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.document_version import DocumentVersion
from models.submission import Submission
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.storage_service import get_local_file, generate_presigned_url, read_file

router = APIRouter(prefix="/api/document-versions", tags=["document-versions"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DocumentVersionResponse(BaseModel):
    id: str
    submission_id: str
    version_number: int
    file_key: str
    created_by: str
    created_by_name: Optional[str]
    change_description: Optional[str]
    checksum: Optional[str]
    file_size: Optional[int]
    is_current: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_submission(db: Session, submission_id: str, tenant_id: str) -> Submission:
    sub = (
        db.query(Submission)
        .join(Project, Project.id == Submission.project_id)
        .filter(Submission.id == submission_id, Project.tenant_id == tenant_id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="提出書類が見つかりません")
    return sub


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/submissions/{submission_id}/versions", response_model=list[DocumentVersionResponse])
def list_versions(
    submission_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """提出書類のバージョン一覧"""
    _get_submission(db, submission_id, user.tenant_id)
    versions = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.submission_id == submission_id)
        .order_by(DocumentVersion.version_number.desc())
        .all()
    )
    return [DocumentVersionResponse.model_validate(v) for v in versions]


@router.get("/submissions/{submission_id}/versions/{version_number}", response_model=DocumentVersionResponse)
def get_version(
    submission_id: str,
    version_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """特定バージョンの詳細"""
    _get_submission(db, submission_id, user.tenant_id)
    version = db.query(DocumentVersion).filter(
        DocumentVersion.submission_id == submission_id,
        DocumentVersion.version_number == version_number,
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="バージョンが見つかりません")
    return DocumentVersionResponse.model_validate(version)


@router.get("/submissions/{submission_id}/versions/{version_number}/download")
def download_version(
    submission_id: str,
    version_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """特定バージョンのファイルをダウンロード"""
    _get_submission(db, submission_id, user.tenant_id)
    version = db.query(DocumentVersion).filter(
        DocumentVersion.submission_id == submission_id,
        DocumentVersion.version_number == version_number,
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="バージョンが見つかりません")

    # Try local file first
    local = get_local_file(version.file_key)
    if local:
        return FileResponse(local, media_type="application/pdf", filename=f"version_{version_number}.pdf")

    # Try presigned URL (S3)
    url = generate_presigned_url(version.file_key)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=url)


@router.get("/{version_id}/download")
def download_version_by_id(
    version_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """バージョンIDでファイルをダウンロード"""
    version = (
        db.query(DocumentVersion)
        .join(Submission, Submission.id == DocumentVersion.submission_id)
        .join(Project, Project.id == Submission.project_id)
        .filter(DocumentVersion.id == version_id, Project.tenant_id == user.tenant_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="バージョンが見つかりません")

    local = get_local_file(version.file_key)
    if local:
        return FileResponse(local, media_type="application/pdf", filename=f"v{version.version_number}.pdf")

    url = generate_presigned_url(version.file_key)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=url)
