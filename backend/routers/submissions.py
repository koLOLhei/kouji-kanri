"""Submission (提出書類) router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models.submission import Submission
from models.document_version import DocumentVersion
from models.user import User
from schemas.submission import SubmissionResponse, GenerateRequest
from services.auth_service import get_current_user
from services.storage_service import generate_presigned_url, compute_checksum, read_file
from services.submission_engine import generate_submission_package, check_phase_completeness

router = APIRouter(prefix="/api/projects/{project_id}/submissions", tags=["submissions"])


@router.get("", response_model=list[SubmissionResponse])
def list_submissions(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subs = db.query(Submission).filter(
        Submission.project_id == project_id
    ).order_by(Submission.created_at.desc()).all()

    result = []
    for s in subs:
        resp = SubmissionResponse.model_validate(s)
        if s.file_key:
            resp.download_url = generate_presigned_url(s.file_key)
        result.append(resp)
    return result


@router.post("/generate", response_model=SubmissionResponse)
def generate_submission(
    project_id: str,
    req: GenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """手動で提出書類を生成"""
    check = check_phase_completeness(db, req.phase_id)
    if not check["complete"]:
        missing = [d for d in check["details"] if not d["fulfilled"] and d["is_mandatory"]]
        raise HTTPException(
            status_code=400,
            detail={
                "message": "必要書類が揃っていません",
                "missing": missing,
            },
        )

    submission = generate_submission_package(db, req.phase_id, user.tenant_id, req.submission_type)

    # Document versioning: save current file as a version record
    if submission.file_key:
        # Compute checksum from stored file
        file_data = read_file(submission.file_key)
        checksum = compute_checksum(file_data) if file_data else None
        file_size = len(file_data) if file_data else None

        # Determine next version number
        last_version = (
            db.query(DocumentVersion)
            .filter(DocumentVersion.submission_id == submission.id)
            .order_by(DocumentVersion.version_number.desc())
            .first()
        )
        next_version_num = (last_version.version_number + 1) if last_version else 1

        # Mark previous versions as not current
        db.query(DocumentVersion).filter(
            DocumentVersion.submission_id == submission.id,
            DocumentVersion.is_current == 1,
        ).update({"is_current": 0})

        version = DocumentVersion(
            submission_id=submission.id,
            version_number=next_version_num,
            file_key=submission.file_key,
            created_by=user.id,
            created_by_name=user.name,
            change_description=req.change_description if hasattr(req, "change_description") else None,
            checksum=checksum,
            file_size=file_size,
            is_current=1,
        )
        db.add(version)

        # Store checksum and version number in submission
        submission.checksum = checksum
        submission.current_version = next_version_num
        db.commit()

    resp = SubmissionResponse.model_validate(submission)
    if submission.file_key:
        resp.download_url = generate_presigned_url(submission.file_key)
    return resp


@router.get("/{submission_id}/check")
def check_readiness(
    project_id: str,
    submission_id: str,
    phase_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """工程の書類充足状況を確認"""
    return check_phase_completeness(db, phase_id)


@router.put("/{submission_id}/submit")
def mark_submitted(
    project_id: str,
    submission_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Submission).filter(
        Submission.id == submission_id, Submission.project_id == project_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="提出書類が見つかりません")
    sub.status = "submitted"
    sub.submitted_at = datetime.utcnow()
    db.commit()
    return {"id": sub.id, "status": sub.status}
