"""竣工書類一括生成 — 30種類以上の書類をまとめて生成・ZIPダウンロード"""

import io
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.submission import Submission
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.storage_service import upload_file, generate_presigned_url, read_file, generate_upload_key
from services.submission_engine import TEMPLATE_REGISTRY, generate_document

router = APIRouter(
    prefix="/api/projects/{project_id}/batch-documents",
    tags=["batch-documents"],
)


# ── スキーマ ─────────────────────────────────────────────────────────────────

class DocumentTypeInfo(BaseModel):
    type_code: str
    label_ja: str
    category: str
    can_generate: bool
    reason: str


class GenerateAllRequest(BaseModel):
    types: list[str] = Field(..., description="生成するテンプレート種別コードのリスト")
    change_description: str | None = None


class GeneratedItem(BaseModel):
    type: str
    title: str
    file_key: str | None = None
    download_url: str | None = None


class FailedItem(BaseModel):
    type: str
    reason: str


class BatchGenerateResponse(BaseModel):
    generated: list[GeneratedItem]
    failed: list[FailedItem]


class ZipDownloadResponse(BaseModel):
    file_key: str
    download_url: str
    file_count: int
    total_size_bytes: int


# ── エンドポイント ─────────────────────────────────────────────────────────────

@router.get("/available-types", response_model=list[DocumentTypeInfo])
def list_available_types(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """このプロジェクトで生成可能な書類種別の一覧"""

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    result = []
    for type_code, info in TEMPLATE_REGISTRY.items():
        required = info.get("required_fields", [])
        can_generate = True
        reason = "生成可能"

        # 基本チェック: project は常に利用可能
        missing = []
        for field in required:
            if field == "project":
                continue
            # DB上のデータ存在チェック（簡易）
            if field == "photos":
                from models.photo import Photo
                count = db.query(Photo).filter(Photo.project_id == project_id).count()
                if count == 0:
                    missing.append("写真")
            elif field == "subcontractors":
                # subcontractors テーブルチェック
                from models.subcontractor import Subcontractor
                count = db.query(Subcontractor).filter(
                    Subcontractor.tenant_id == user.tenant_id,
                ).count()
                if count == 0:
                    missing.append("下請業者")
            # 他のフィールドはコンテキストデータで補えるため、生成自体は可能

        if missing:
            can_generate = False
            reason = f"不足データ: {', '.join(missing)}"

        result.append(DocumentTypeInfo(
            type_code=type_code,
            label_ja=info["label_ja"],
            category=info.get("category", "general"),
            can_generate=can_generate,
            reason=reason,
        ))

    return result


@router.post("/generate-all", response_model=BatchGenerateResponse)
def generate_all_documents(
    project_id: str,
    req: GenerateAllRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """複数書類種別を一括生成"""

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    if not req.types:
        raise HTTPException(status_code=400, detail="生成する書類種別を1つ以上指定してください")

    generated: list[GeneratedItem] = []
    failed: list[FailedItem] = []

    for type_code in req.types:
        info = TEMPLATE_REGISTRY.get(type_code)
        if not info:
            failed.append(FailedItem(type=type_code, reason=f"未知のテンプレート種別: {type_code}"))
            continue

        context: dict[str, Any] = {
            "project": project,
            "project_id": project_id,
        }
        if req.change_description:
            context["change_description"] = req.change_description

        try:
            file_bytes = generate_document(type_code, context, db)
        except Exception as e:
            failed.append(FailedItem(type=type_code, reason=str(e)))
            continue

        # ストレージにアップロード
        file_key = generate_upload_key(
            user.tenant_id, project_id, "batch_docs",
            f"{type_code}_{uuid.uuid4().hex[:8]}.pdf",
        )
        try:
            upload_file(file_bytes, file_key, "application/pdf")
        except Exception as e:
            failed.append(FailedItem(type=type_code, reason=f"アップロード失敗: {e}"))
            continue

        # Submission レコード作成
        submission = Submission(
            project_id=project_id,
            submission_type=type_code,
            title=info["label_ja"],
            file_key=file_key,
            status="ready",
            generated_at=datetime.now(timezone.utc),
            metadata_json={"batch_generated": True},
        )
        db.add(submission)

        download_url = generate_presigned_url(file_key)
        generated.append(GeneratedItem(
            type=type_code,
            title=info["label_ja"],
            file_key=file_key,
            download_url=download_url,
        ))

    db.commit()

    return BatchGenerateResponse(generated=generated, failed=failed)


@router.post("/zip-download", response_model=ZipDownloadResponse)
def zip_download(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """プロジェクトの全生成済み書類をZIPでダウンロード"""

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    # file_key を持つ全Submissionを取得
    submissions = db.query(Submission).filter(
        Submission.project_id == project_id,
        Submission.file_key.isnot(None),
    ).order_by(Submission.created_at.asc()).all()

    if not submissions:
        raise HTTPException(status_code=400, detail="ダウンロード可能な書類がありません")

    # ZIPをメモリ上で作成
    zip_buffer = io.BytesIO()
    file_count = 0
    total_size = 0

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        seen_names: set[str] = set()
        for sub in submissions:
            file_data = read_file(sub.file_key)
            if not file_data:
                continue

            # ファイル名の重複回避
            ext = sub.file_key.rsplit(".", 1)[-1] if "." in sub.file_key else "pdf"
            base_name = f"{sub.submission_type}_{sub.title}"
            file_name = f"{base_name}.{ext}"
            counter = 1
            while file_name in seen_names:
                file_name = f"{base_name}_{counter}.{ext}"
                counter += 1
            seen_names.add(file_name)

            zf.writestr(file_name, file_data)
            file_count += 1
            total_size += len(file_data)

    if file_count == 0:
        raise HTTPException(status_code=400, detail="読み取り可能なファイルがありません")

    # ZIPをストレージにアップロード
    zip_bytes = zip_buffer.getvalue()
    zip_key = generate_upload_key(
        user.tenant_id, project_id, "zip_downloads",
        f"batch_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.zip",
    )
    upload_file(zip_bytes, zip_key, "application/zip")
    download_url = generate_presigned_url(zip_key)

    return ZipDownloadResponse(
        file_key=zip_key,
        download_url=download_url,
        file_count=file_count,
        total_size_bytes=total_size,
    )
