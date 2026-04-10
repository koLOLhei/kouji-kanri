"""撮影ガイド（見本写真） router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.instruction import PhotoGuide
from models.user import User
from services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/api/photo-guides", tags=["photo-guides"])


# ---------- Schemas ----------

class PhotoGuideCreate(BaseModel):
    work_type: str
    photo_category: str
    title: str
    description: str | None = None
    angle_guide: str | None = None
    required_elements: list | None = None
    example_file_key: str | None = None
    sort_order: int = 0


# ---------- Endpoints ----------

@router.get("")
def list_photo_guides(
    work_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(PhotoGuide)
    if work_type:
        q = q.filter(PhotoGuide.work_type == work_type)
    return q.order_by(PhotoGuide.sort_order).all()


@router.get("/{guide_id}")
def get_photo_guide(
    guide_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.query(PhotoGuide).filter(PhotoGuide.id == guide_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="撮影ガイドが見つかりません")
    return record


@router.post("", status_code=201)
def create_photo_guide(
    body: PhotoGuideCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    record = PhotoGuide(**body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
