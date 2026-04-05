"""Specification browser router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.spec import SpecChapter, RegionalOverride
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/specs", tags=["specs"])


@router.get("/chapters")
def list_chapters(
    spec_code: str = "kokyo_r7",
    chapter: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(SpecChapter).filter(SpecChapter.spec_code == spec_code)
    if chapter:
        q = q.filter(SpecChapter.chapter_number == chapter)
    chapters = q.order_by(SpecChapter.sort_order).all()
    return [
        {
            "id": c.id, "chapter_number": c.chapter_number,
            "section_number": c.section_number, "title": c.title,
            "required_documents": c.required_documents or [],
        }
        for c in chapters
    ]


@router.get("/regions")
def list_regions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    regions = db.query(RegionalOverride.region).distinct().all()
    return [r[0] for r in regions]
