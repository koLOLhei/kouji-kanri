"""Photo (工事写真) router."""

import asyncio
import io
import zipfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

# C17: Magic bytes for allowed file types.
# The extension alone is not trustworthy — a malicious user can rename a script to .jpg.
# Verify the actual binary signature before processing.
_ALLOWED_MAGIC: dict[bytes, str] = {
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG': 'image/png',
    b'GIF8': 'image/gif',
    b'RIFF': 'image/webp',   # RIFF????WEBP — first 4 bytes are sufficient for initial guard
    b'%PDF': 'application/pdf',
}
# Maximum byte prefix we need to read to identify any allowed type
_MAGIC_CHECK_LEN = max(len(m) for m in _ALLOWED_MAGIC)


def _validate_file_magic(file_data: bytes) -> bool:
    """Return True if `file_data` begins with a known-safe magic byte sequence."""
    header = file_data[:_MAGIC_CHECK_LEN]
    for magic in _ALLOWED_MAGIC:
        if header[:len(magic)] == magic:
            return True
    return False

from database import get_db
from models.project import Project
from models.photo import Photo
from models.user import User
from schemas.photo import PhotoResponse, PhotoUpdate
from services.auth_service import get_current_user
from services.storage_service import generate_upload_key, upload_file, generate_presigned_url, compute_checksum, read_file
from services.photo_service import extract_exif, create_thumbnail
from services.submission_engine import auto_generate_if_ready
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/photos", tags=["photos"])

MAX_BULK_PHOTOS = 200


@router.get("/download-zip")
def download_photos_zip(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトの全写真をZIPでダウンロードする。"""
    verify_project_access(project_id, user, db)

    photo_count = db.query(Photo).filter(Photo.project_id == project_id).count()
    if photo_count == 0:
        raise HTTPException(status_code=404, detail="写真が見つかりません")
    if photo_count > MAX_BULK_PHOTOS:
        raise HTTPException(
            status_code=400,
            detail=f"写真が{MAX_BULK_PHOTOS}枚を超えています。範囲を絞ってください。",
        )

    photos = db.query(Photo).filter(Photo.project_id == project_id).all()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, photo in enumerate(photos, 1):
            file_data = read_file(photo.file_key)
            if file_data is None:
                continue
            filename = photo.original_filename or f"photo_{idx}.jpg"
            # 重複ファイル名を回避
            arcname = f"{idx:04d}_{filename}"
            zf.writestr(arcname, file_data)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=photos_{project_id}.zip"},
    )


@router.get("", response_model=list[PhotoResponse])
def list_photos(
    project_id: str,
    phase_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(Photo).filter(Photo.project_id == project_id)
    if phase_id:
        q = q.filter(Photo.phase_id == phase_id)
    photos = q.order_by(Photo.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for p in photos:
        resp = PhotoResponse.model_validate(p)
        resp.url = generate_presigned_url(p.file_key)
        if p.thumbnail_key:
            resp.thumbnail_url = generate_presigned_url(p.thumbnail_key)
        result.append(resp)
    return result


@router.post("", response_model=PhotoResponse)
async def upload_photo(
    project_id: str,
    file: UploadFile = File(...),
    phase_id: str | None = Form(None),
    requirement_id: str | None = Form(None),
    caption: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # プロジェクト確認
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    # ファイル読込 (async - UploadFile requires await)
    file_data = await file.read()

    # C17: Validate file magic bytes before any processing
    if not _validate_file_magic(file_data):
        raise HTTPException(
            status_code=400,
            detail="サポートされていないファイル形式です。JPEG・PNG・GIF・WebP・PDFのみ許可されています",
        )

    # EXIF抽出・サムネイル作成・アップロードはブロッキングI/O → スレッドプールで実行
    def _process_and_upload():
        exif = extract_exif(file_data)
        thumbnail_data = create_thumbnail(file_data)
        file_key = generate_upload_key(user.tenant_id, project_id, "photos", file.filename or "photo.jpg")
        upload_file(file_data, file_key, file.content_type or "image/jpeg")
        thumb_key = file_key.replace("/photos/", "/thumbnails/")
        upload_file(thumbnail_data, thumb_key, "image/jpeg")
        checksum = compute_checksum(file_data)
        return exif, file_key, thumb_key, checksum

    exif, file_key, thumb_key, checksum = await asyncio.to_thread(_process_and_upload)

    # DB保存
    photo = Photo(
        project_id=project_id,
        phase_id=phase_id,
        requirement_id=requirement_id,
        file_key=file_key,
        thumbnail_key=thumb_key,
        original_filename=file.filename,
        file_size=len(file_data),
        mime_type=file.content_type,
        width=exif.get("width"),
        height=exif.get("height"),
        taken_at=exif.get("taken_at"),
        gps_lat=exif.get("gps_lat"),
        gps_lng=exif.get("gps_lng"),
        caption=caption,
        uploaded_by=user.id,
        checksum=checksum,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    # 自動書類生成チェック
    if phase_id:
        await asyncio.to_thread(auto_generate_if_ready, db, phase_id, user.tenant_id)

    resp = PhotoResponse.model_validate(photo)
    resp.url = generate_presigned_url(photo.file_key)
    resp.thumbnail_url = generate_presigned_url(photo.thumbnail_key)
    return resp


@router.put("/{photo_id}", response_model=PhotoResponse)
def update_photo(
    project_id: str,
    photo_id: str,
    req: PhotoUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.project_id == project_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="写真が見つかりません")

    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(photo, key, value)
    db.commit()
    db.refresh(photo)
    return PhotoResponse.model_validate(photo)


@router.delete("/{photo_id}")
def delete_photo(
    project_id: str,
    photo_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.project_id == project_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="写真が見つかりません")
    db.delete(photo)
    db.commit()
    return {"status": "ok"}
