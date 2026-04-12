"""電子署名 API ルーター — 書類への署名・署名一覧・改ざん検知"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.esign import ElectronicSignature
from models.submission import Submission
from models.user import User
from services.auth_service import get_current_user
from services.storage_service import read_file
from services.esign_service import create_document_hash, create_esign_record, verify_esign

router = APIRouter(prefix="/api/documents", tags=["esign"])


class SignRequest(BaseModel):
    signer_name: str
    signer_email: str
    signer_role: str | None = None


def _to_dict(sig: ElectronicSignature) -> dict:
    return {c.name: getattr(sig, c.name) for c in sig.__table__.columns}


def _get_submission(submission_id: str, user: User, db: Session) -> Submission:
    sub = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.project_id.isnot(None),
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="書類が見つかりません")
    return sub


@router.post("/{submission_id}/sign")
def sign_document(
    submission_id: str,
    req: SignRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """書類に電子署名を付与する。ファイルキーが存在する場合はドキュメントハッシュも計算する。"""
    sub = _get_submission(submission_id, user, db)

    # ドキュメントのハッシュを計算（ファイルが存在する場合）
    document_hash: str
    if sub.file_key:
        raw = read_file(sub.file_key)
        if raw:
            document_hash = create_document_hash(raw)
        elif sub.checksum:
            document_hash = sub.checksum
        else:
            document_hash = create_document_hash(sub.title.encode())
    elif sub.checksum:
        document_hash = sub.checksum
    else:
        # ファイルが未生成でもタイトルベースのハッシュで記録する
        document_hash = create_document_hash(sub.title.encode())

    record = create_esign_record(document_hash, req.signer_name, req.signer_email)

    sig = ElectronicSignature(
        submission_id=submission_id,
        document_hash=record["document_hash"],
        signer_name=record["signer_name"],
        signer_email=record["signer_email"],
        signer_role=req.signer_role or user.role,
        signed_at=datetime.fromisoformat(record["signed_at"]),
        proof_hash=record["proof_hash"],
        ip_address=request.client.host if request.client else None,
        device_info=request.headers.get("user-agent"),
        tenant_id=user.tenant_id,
    )
    db.add(sig)
    db.commit()
    db.refresh(sig)
    return _to_dict(sig)


@router.get("/{submission_id}/signatures")
def list_signatures(
    submission_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """書類の電子署名一覧を返す。"""
    _get_submission(submission_id, user, db)
    sigs = db.query(ElectronicSignature).filter(
        ElectronicSignature.submission_id == submission_id,
        ElectronicSignature.tenant_id == user.tenant_id,
    ).order_by(ElectronicSignature.signed_at.asc()).all()
    return [_to_dict(s) for s in sigs]


@router.get("/{submission_id}/verify")
def verify_document(
    submission_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """書類の整合性（改ざん有無）を検証する。"""
    sub = _get_submission(submission_id, user, db)

    sigs = db.query(ElectronicSignature).filter(
        ElectronicSignature.submission_id == submission_id,
        ElectronicSignature.tenant_id == user.tenant_id,
    ).order_by(ElectronicSignature.signed_at.asc()).all()

    if not sigs:
        return {"submission_id": submission_id, "signed": False, "verified": False, "signatures": []}

    # 現在のファイルハッシュと署名時のハッシュを比較
    current_hash: str | None = None
    file_accessible = False

    if sub.file_key:
        raw = read_file(sub.file_key)
        if raw:
            current_hash = create_document_hash(raw)
            file_accessible = True

    if current_hash is None and sub.checksum:
        current_hash = sub.checksum
        file_accessible = True

    sig_results = []
    for s in sigs:
        if file_accessible and current_hash:
            intact = verify_esign(b"", {"document_hash": s.document_hash}) if not file_accessible else (current_hash == s.document_hash)
        else:
            intact = None  # ファイルにアクセスできないため検証不可
        sig_results.append({
            **_to_dict(s),
            "document_intact": intact,
        })

    all_intact = all(r["document_intact"] for r in sig_results if r["document_intact"] is not None)

    return {
        "submission_id": submission_id,
        "signed": True,
        "signature_count": len(sigs),
        "verified": all_intact if file_accessible else None,
        "current_document_hash": current_hash,
        "signatures": sig_results,
    }
