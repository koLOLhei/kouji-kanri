"""File integrity verification endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.photo import Photo
from models.report import Report
from models.submission import Submission
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.storage_service import compute_checksum, read_file, verify_file_checksum

router = APIRouter(prefix="/api/files", tags=["file-integrity"])


@router.get("/{path:path}/verify")
def verify_file(
    path: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ファイルの整合性をSHA-256チェックサムで検証する。

    DBに保存されているチェックサムと実際のファイルのチェックサムを比較し、
    改ざんや破損の有無を返します。テナント所有のファイルのみ検証可能。
    """
    file_key = path  # path captured from URL

    # Look up stored checksum in any model - always join to Project for tenant isolation
    stored_checksum: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    found = False

    photo = (
        db.query(Photo)
        .join(Project, Project.id == Photo.project_id)
        .filter(Photo.file_key == file_key, Project.tenant_id == user.tenant_id)
        .first()
    )
    if photo:
        stored_checksum = photo.checksum
        entity_type = "photo"
        entity_id = photo.id
        found = True

    if not found:
        report = (
            db.query(Report)
            .join(Project, Project.id == Report.project_id)
            .filter(Report.file_key == file_key, Project.tenant_id == user.tenant_id)
            .first()
        )
        if report:
            stored_checksum = report.checksum
            entity_type = "report"
            entity_id = report.id
            found = True

    if not found:
        submission = (
            db.query(Submission)
            .join(Project, Project.id == Submission.project_id)
            .filter(Submission.file_key == file_key, Project.tenant_id == user.tenant_id)
            .first()
        )
        if submission:
            stored_checksum = submission.checksum
            entity_type = "submission"
            entity_id = submission.id
            found = True

    if not found:
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    # Read actual file
    data = read_file(file_key)
    if data is None:
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    actual_checksum = compute_checksum(data)

    if stored_checksum is None:
        return {
            "file_key": file_key,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "status": "no_checksum",
            "message": "DBにチェックサムが保存されていません",
            "actual_checksum": actual_checksum,
            "file_size": len(data),
        }

    is_valid = actual_checksum == stored_checksum
    return {
        "file_key": file_key,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "status": "ok" if is_valid else "tampered",
        "is_valid": is_valid,
        "stored_checksum": stored_checksum,
        "actual_checksum": actual_checksum,
        "file_size": len(data),
        "message": "整合性OK" if is_valid else "警告: ファイルが改ざんされているか破損しています",
    }
