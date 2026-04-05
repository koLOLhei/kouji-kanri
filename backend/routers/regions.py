"""Regional specification override router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.spec import RegionalOverride, SpecChapter
from models.user import User
from services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/api/regions", tags=["regions"])


class RegionalOverrideCreate(BaseModel):
    region: str
    spec_chapter_id: str | None = None
    override_type: str  # add_requirement, modify, remove
    data: dict
    notes: str | None = None


class RegionalOverrideResponse(BaseModel):
    id: str
    region: str
    spec_chapter_id: str | None
    override_type: str
    data: dict
    notes: str | None
    chapter_title: str | None = None

    class Config:
        from_attributes = True


# 対応地域
SUPPORTED_REGIONS = [
    {"code": "default", "name": "標準（国土交通省）"},
    {"code": "tokyo", "name": "東京都"},
    {"code": "osaka", "name": "大阪府"},
    {"code": "nagoya", "name": "名古屋市"},
    {"code": "yokohama", "name": "横浜市"},
    {"code": "sapporo", "name": "札幌市"},
    {"code": "fukuoka", "name": "福岡市"},
    {"code": "sendai", "name": "仙台市"},
    {"code": "hiroshima", "name": "広島市"},
]


@router.get("")
def list_supported_regions():
    """対応地域一覧"""
    return SUPPORTED_REGIONS


@router.get("/{region}/overrides", response_model=list[RegionalOverrideResponse])
def list_overrides(
    region: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    overrides = db.query(RegionalOverride).filter(
        RegionalOverride.region == region
    ).order_by(RegionalOverride.created_at).all()

    result = []
    for o in overrides:
        resp = RegionalOverrideResponse.model_validate(o)
        if o.spec_chapter_id:
            ch = db.query(SpecChapter).filter(SpecChapter.id == o.spec_chapter_id).first()
            resp.chapter_title = ch.title if ch else None
        result.append(resp)
    return result


@router.post("/{region}/overrides", response_model=RegionalOverrideResponse)
def add_override(
    region: str,
    req: RegionalOverrideCreate,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    override = RegionalOverride(
        region=region,
        spec_chapter_id=req.spec_chapter_id,
        override_type=req.override_type,
        data=req.data,
        notes=req.notes,
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return RegionalOverrideResponse.model_validate(override)


@router.delete("/{region}/overrides/{override_id}")
def delete_override(
    region: str,
    override_id: str,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    override = db.query(RegionalOverride).filter(
        RegionalOverride.id == override_id,
        RegionalOverride.region == region,
    ).first()
    if not override:
        raise HTTPException(status_code=404, detail="オーバーライドが見つかりません")
    db.delete(override)
    db.commit()
    return {"status": "ok"}
