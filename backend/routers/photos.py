"""Photo (工事写真) router."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.photo import Photo
from models.user import User
from schemas.photo import PhotoResponse, PhotoUpdate
from services.auth_service import get_current_user
from services.storage_service import generate_upload_key, upload_file, generate_presigned_url, compute_checksum
from services.photo_service import extract_exif, create_thumbnail
from services.submission_engine import auto_generate_if_ready

router = APIRouter(prefix="/api/projects/{project_id}/photos", tags=["photos"])


@router.get("", response_model=list[PhotoResponse])
def list_photos(
    project_id: str,
    phase_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Photo).filter(Photo.project_id == project_id)
    if phase_id:
        q = q.filter(Photo.phase_id == phase_id)
    photos = q.order_by(Photo.created_at.desc()).all()

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

    # ファイル読込
    file_data = await file.read()

    # EXIF抽出
    exif = extract_exif(file_data)

    # サムネイル作成
    thumbnail_data = create_thumbnail(file_data)

    # S3アップロード
    file_key = generate_upload_key(user.tenant_id, project_id, "photos", file.filename or "photo.jpg")
    upload_file(file_data, file_key, file.content_type or "image/jpeg")

    thumb_key = file_key.replace("/photos/", "/thumbnails/")
    upload_file(thumbnail_data, thumb_key, "image/jpeg")

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
        checksum=compute_checksum(file_data),
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    # 自動書類生成チェック
    if phase_id:
        auto_generate_if_ready(db, phase_id, user.tenant_id)

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
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.project_id == project_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="写真が見つかりません")
    db.delete(photo)
    db.commit()
    return {"status": "ok"}
