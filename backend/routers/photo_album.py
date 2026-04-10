"""写真台帳の自動レイアウト生成 — Photoruction同等の2/4/6枚レイアウト対応"""

import base64
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.photo import Photo
from models.project import Project
from models.submission import Submission
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.storage_service import generate_presigned_url, upload_file, generate_upload_key, read_file

router = APIRouter(
    prefix="/api/projects/{project_id}/photo-album",
    tags=["photo-album"],
)


# ── スキーマ ─────────────────────────────────────────────────────────────────

class GenerateAlbumRequest(BaseModel):
    phase_id: str | None = None
    layout: str = Field(
        default="2x1",
        description="レイアウト: '1x1' | '2x1' | '2x2' | '3x2'",
    )
    title: str | None = None
    include_blackboard: bool = True


class AlbumPhotoItem(BaseModel):
    id: str
    caption: str | None = None
    taken_at: datetime | None = None
    thumbnail_url: str | None = None
    work_type: str | None = None
    photo_category: str | None = None


class AlbumSubmissionResponse(BaseModel):
    submission_id: str
    title: str
    file_key: str | None = None
    download_url: str | None = None
    photo_count: int
    layout: str
    generated_at: datetime


# ── エンドポイント ─────────────────────────────────────────────────────────────

@router.post("/generate", response_model=AlbumSubmissionResponse)
def generate_photo_album(
    project_id: str,
    req: GenerateAlbumRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """写真台帳PDFを生成（工程/案件単位）"""

    # プロジェクト確認
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    # レイアウト検証
    valid_layouts = {"1x1", "2x1", "2x2", "3x2"}
    if req.layout not in valid_layouts:
        raise HTTPException(
            status_code=400,
            detail=f"無効なレイアウト: {req.layout}。有効値: {sorted(valid_layouts)}",
        )

    # 写真取得
    q = db.query(Photo).filter(Photo.project_id == project_id)
    if req.phase_id:
        q = q.filter(Photo.phase_id == req.phase_id)
    photos = q.order_by(Photo.photo_number.asc(), Photo.created_at.asc()).all()

    if not photos:
        raise HTTPException(status_code=400, detail="写真が見つかりません")

    # 各写真のデータ辞書を構築（base64データURIで埋め込み — WeasyPrintがlocalhost URLを取得できない問題を回避）
    photo_entries = []
    for p in photos:
        entry = {
            "caption": p.caption or "",
            "taken_at": p.taken_at,
            "work_type": p.work_type or "",
            "photo_category": p.photo_category or "",
            "file_key": p.file_key,
        }
        # ファイル実体を読み込みbase64データURIとして埋め込む
        file_data = read_file(p.file_key) if p.file_key else None
        if file_data:
            b64 = base64.b64encode(file_data).decode("utf-8")
            mime = p.mime_type or "image/jpeg"
            entry["image_data_uri"] = f"data:{mime};base64,{b64}"
            # テンプレート後方互換のためphoto_urlにも同じ値を設定
            entry["photo_url"] = entry["image_data_uri"]
        else:
            entry["image_data_uri"] = None
            entry["photo_url"] = None
        # サムネイルも同様に埋め込む
        if p.thumbnail_key:
            thumb_data = read_file(p.thumbnail_key)
            if thumb_data:
                tb64 = base64.b64encode(thumb_data).decode("utf-8")
                entry["thumbnail_url"] = f"data:image/jpeg;base64,{tb64}"
            else:
                entry["thumbnail_url"] = None
        else:
            entry["thumbnail_url"] = None
        photo_entries.append(entry)

    # Jinja2テンプレートでHTML生成
    from jinja2 import Environment, FileSystemLoader
    import os

    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    jinja_env = Environment(loader=FileSystemLoader(template_dir))

    album_title = req.title or f"{project.name} 工事写真帳"
    context = {
        "project": project,
        "photos": photo_entries,
        "layout": req.layout,
        "title": album_title,
        "include_blackboard": req.include_blackboard,
        "generated_at": datetime.now(timezone.utc),
    }

    try:
        template = jinja_env.get_template("kouji_shashincho.html")
        html_content = template.render(**context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"テンプレート描画に失敗: {e}")

    # WeasyPrintでPDF変換
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
    except ImportError:
        # WeasyPrint未インストール時はHTMLをそのまま保存
        pdf_bytes = html_content.encode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成に失敗: {e}")

    # ストレージにアップロード
    file_key = generate_upload_key(
        user.tenant_id, project_id, "photo_albums",
        f"shashincho_{req.layout}_{uuid.uuid4().hex[:8]}.pdf",
    )
    upload_file(pdf_bytes, file_key, "application/pdf")

    # Submission レコード作成
    submission = Submission(
        project_id=project_id,
        phase_id=req.phase_id,
        submission_type="kouji_shashincho",
        title=album_title,
        file_key=file_key,
        status="ready",
        generated_at=datetime.now(timezone.utc),
        metadata_json={
            "layout": req.layout,
            "photo_count": len(photo_entries),
            "include_blackboard": req.include_blackboard,
        },
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    download_url = generate_presigned_url(file_key)

    return AlbumSubmissionResponse(
        submission_id=submission.id,
        title=album_title,
        file_key=file_key,
        download_url=download_url,
        photo_count=len(photo_entries),
        layout=req.layout,
        generated_at=submission.generated_at,
    )


@router.get("/preview", response_model=list[AlbumPhotoItem])
def preview_album_photos(
    project_id: str,
    phase_id: str | None = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """写真台帳に含まれる写真データのプレビュー（生成前確認用）"""

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    q = db.query(Photo).filter(Photo.project_id == project_id)
    if phase_id:
        q = q.filter(Photo.phase_id == phase_id)
    photos = q.order_by(Photo.photo_number.asc(), Photo.created_at.asc()).limit(limit).all()

    result = []
    for p in photos:
        thumbnail_url = None
        if p.thumbnail_key:
            thumbnail_url = generate_presigned_url(p.thumbnail_key)
        result.append(AlbumPhotoItem(
            id=p.id,
            caption=p.caption,
            taken_at=p.taken_at,
            thumbnail_url=thumbnail_url,
            work_type=p.work_type,
            photo_category=p.photo_category,
        ))
    return result
