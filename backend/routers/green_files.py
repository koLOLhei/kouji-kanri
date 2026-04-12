"""Green file (グリーンファイル) router.

グリーンファイルとは建設現場で元請が管理する安全衛生・施工体制書類群。
代表的なもの:
  - 作業員名簿
  - 安全衛生教育実施報告書
  - 施工体制台帳
  - 持込機械等使用届
  - 有機溶剤・特定化学物質等持込使用届
  - 火気使用届
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.green_file import GreenFile, FILE_TYPES, STATUS_PENDING, STATUS_SUBMITTED, STATUS_APPROVED, STATUS_REJECTED
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.errors import AppError

router = APIRouter(prefix="/api/projects/{project_id}/green-files", tags=["green-files"])


# ---------- Schemas ----------

class GreenFileCreate(BaseModel):
    file_type: str
    title: str | None = None
    subcontractor_id: str | None = None
    file_key: str | None = None
    notes: str | None = None
    due_date: datetime | None = None


class GreenFileUpdate(BaseModel):
    title: str | None = None
    subcontractor_id: str | None = None
    file_key: str | None = None
    notes: str | None = None
    due_date: datetime | None = None
    status: str | None = None


class GreenFileSubmit(BaseModel):
    file_key: str
    notes: str | None = None


class GreenFileReview(BaseModel):
    approved: bool
    rejection_reason: str | None = None


# ---------- Validation ----------

def _validate_file_type(file_type: str) -> None:
    if file_type not in FILE_TYPES:
        raise AppError(
            400,
            f"無効な書類種別です。有効な種別: {', '.join(FILE_TYPES.keys())}",
            "INVALID_FILE_TYPE",
        )


def _validate_status(status: str) -> None:
    valid = {STATUS_PENDING, STATUS_SUBMITTED, STATUS_APPROVED, STATUS_REJECTED}
    if status not in valid:
        raise AppError(400, f"無効なステータスです。有効: {', '.join(valid)}", "INVALID_STATUS")


# ---------- Endpoints ----------

@router.get("")
def list_green_files(
    project_id: str,
    file_type: str | None = None,
    status: str | None = None,
    subcontractor_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトのグリーンファイル一覧を取得する。"""
    verify_project_access(project_id, user, db)

    q = db.query(GreenFile).filter(
        GreenFile.project_id == project_id,
        GreenFile.tenant_id == user.tenant_id,
    )
    if file_type:
        _validate_file_type(file_type)
        q = q.filter(GreenFile.file_type == file_type)
    if status:
        _validate_status(status)
        q = q.filter(GreenFile.status == status)
    if subcontractor_id:
        q = q.filter(GreenFile.subcontractor_id == subcontractor_id)

    total = q.count()
    items = q.order_by(GreenFile.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/file-types")
def list_file_types(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """利用可能なグリーンファイル書類種別一覧を返す。"""
    verify_project_access(project_id, user, db)
    return [{"code": k, "label": v} for k, v in FILE_TYPES.items()]


@router.get("/summary")
def green_file_summary(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """書類種別ごとのステータスサマリーを返す。"""
    verify_project_access(project_id, user, db)

    summary = {}
    for ft, label in FILE_TYPES.items():
        files = db.query(GreenFile).filter(
            GreenFile.project_id == project_id,
            GreenFile.tenant_id == user.tenant_id,
            GreenFile.file_type == ft,
        ).all()
        summary[ft] = {
            "label": label,
            "total": len(files),
            "pending": sum(1 for f in files if f.status == STATUS_PENDING),
            "submitted": sum(1 for f in files if f.status == STATUS_SUBMITTED),
            "approved": sum(1 for f in files if f.status == STATUS_APPROVED),
            "rejected": sum(1 for f in files if f.status == STATUS_REJECTED),
        }
    return summary


@router.post("")
def create_green_file(
    project_id: str,
    req: GreenFileCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """グリーンファイル書類を新規登録する。"""
    verify_project_access(project_id, user, db)
    _validate_file_type(req.file_type)

    title = req.title or FILE_TYPES.get(req.file_type, req.file_type)

    gf = GreenFile(
        project_id=project_id,
        tenant_id=user.tenant_id,
        file_type=req.file_type,
        title=title,
        subcontractor_id=req.subcontractor_id,
        file_key=req.file_key,
        notes=req.notes,
        due_date=req.due_date,
        status=STATUS_PENDING,
    )
    db.add(gf)
    db.commit()
    db.refresh(gf)
    return gf


@router.get("/{gf_id}")
def get_green_file(
    project_id: str,
    gf_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """グリーンファイル書類の詳細を取得する。"""
    verify_project_access(project_id, user, db)
    gf = db.query(GreenFile).filter(
        GreenFile.id == gf_id,
        GreenFile.project_id == project_id,
        GreenFile.tenant_id == user.tenant_id,
    ).first()
    if not gf:
        raise AppError(404, "グリーンファイルが見つかりません", "GREEN_FILE_NOT_FOUND")
    return gf


@router.put("/{gf_id}")
def update_green_file(
    project_id: str,
    gf_id: str,
    req: GreenFileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """グリーンファイル書類を更新する。"""
    verify_project_access(project_id, user, db)
    gf = db.query(GreenFile).filter(
        GreenFile.id == gf_id,
        GreenFile.project_id == project_id,
        GreenFile.tenant_id == user.tenant_id,
    ).first()
    if not gf:
        raise AppError(404, "グリーンファイルが見つかりません", "GREEN_FILE_NOT_FOUND")

    if req.status:
        _validate_status(req.status)

    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(gf, k, v)
    db.commit()
    db.refresh(gf)
    return gf


@router.post("/{gf_id}/submit")
def submit_green_file(
    project_id: str,
    gf_id: str,
    req: GreenFileSubmit,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """グリーンファイル書類を提出する（ファイルキーを添付してステータスを submitted に変更）。"""
    verify_project_access(project_id, user, db)
    gf = db.query(GreenFile).filter(
        GreenFile.id == gf_id,
        GreenFile.project_id == project_id,
        GreenFile.tenant_id == user.tenant_id,
    ).first()
    if not gf:
        raise AppError(404, "グリーンファイルが見つかりません", "GREEN_FILE_NOT_FOUND")

    if gf.status == STATUS_APPROVED:
        raise AppError(400, "承認済みの書類は再提出できません", "ALREADY_APPROVED")

    gf.file_key = req.file_key
    gf.notes = req.notes or gf.notes
    gf.status = STATUS_SUBMITTED
    gf.submitted_by = user.id
    gf.submitted_at = datetime.now(timezone.utc)
    gf.rejection_reason = None  # Clear previous rejection reason on resubmission
    db.commit()
    db.refresh(gf)
    return gf


@router.post("/{gf_id}/review")
def review_green_file(
    project_id: str,
    gf_id: str,
    req: GreenFileReview,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """グリーンファイル書類を承認または却下する（管理者・マネージャー権限）。"""
    if user.role not in ("admin", "super_admin", "manager"):
        raise AppError(403, "承認権限がありません", "FORBIDDEN")

    verify_project_access(project_id, user, db)
    gf = db.query(GreenFile).filter(
        GreenFile.id == gf_id,
        GreenFile.project_id == project_id,
        GreenFile.tenant_id == user.tenant_id,
    ).first()
    if not gf:
        raise AppError(404, "グリーンファイルが見つかりません", "GREEN_FILE_NOT_FOUND")

    if gf.status != STATUS_SUBMITTED:
        raise AppError(400, "提出済みの書類のみ審査できます", "NOT_SUBMITTED")

    if req.approved:
        gf.status = STATUS_APPROVED
        gf.approved_by = user.id
        gf.approved_at = datetime.now(timezone.utc)
        gf.rejection_reason = None
    else:
        if not req.rejection_reason:
            raise AppError(400, "却下理由を入力してください", "REJECTION_REASON_REQUIRED")
        gf.status = STATUS_REJECTED
        gf.rejection_reason = req.rejection_reason
        gf.approved_by = None
        gf.approved_at = None

    db.commit()
    db.refresh(gf)
    return gf


@router.delete("/{gf_id}")
def delete_green_file(
    project_id: str,
    gf_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """グリーンファイル書類を削除する。承認済みの書類は削除不可。"""
    verify_project_access(project_id, user, db)
    gf = db.query(GreenFile).filter(
        GreenFile.id == gf_id,
        GreenFile.project_id == project_id,
        GreenFile.tenant_id == user.tenant_id,
    ).first()
    if not gf:
        raise AppError(404, "グリーンファイルが見つかりません", "GREEN_FILE_NOT_FOUND")

    if gf.status == STATUS_APPROVED:
        raise AppError(400, "承認済みの書類は削除できません", "CANNOT_DELETE_APPROVED")

    db.delete(gf)
    db.commit()
    return {"status": "ok", "id": gf_id}
