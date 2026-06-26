"""劣化診断（現地調査）router — kamo-hp 社内ツール連携。

マンション大規模修繕の劣化診断（タイル/外壁/シーリング/防水/鉄部）を
テナント単位で保存・共有する。同一テナントのユーザーは互いの診断を
閲覧・編集できる（現場の複数担当者で共有する想定）。
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.degradation_survey import DegradationSurvey
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/degradation-surveys", tags=["degradation-surveys"])


# ---------- Schemas ----------

class SurveyUpsert(BaseModel):
    property_name: str = ""
    address: str | None = None
    overall_grade: str | None = None
    inspector_name: str | None = None
    survey_date: str | None = None
    status: str | None = None
    data: dict | None = None
    photos: list | None = None


# ---------- Helpers ----------

# 部分更新で許可するフィールド
_UPDATABLE = ("property_name", "address", "overall_grade", "inspector_name", "survey_date", "status", "data", "photos")


def _serialize(s: DegradationSurvey, *, heavy: bool = True) -> dict:
    """1件をdictに変換。heavy=False では data/photos を除いて軽量化（一覧用）。"""
    out = {
        "id": s.id,
        "property_name": s.property_name,
        "address": s.address,
        "overall_grade": s.overall_grade,
        "inspector_name": s.inspector_name,
        "survey_date": s.survey_date,
        "status": s.status,
        "created_by": s.created_by,
        "photo_count": len(s.photos) if isinstance(s.photos, list) else 0,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }
    if heavy:
        out["data"] = s.data
        out["photos"] = s.photos
    return out


def _get_or_404(db: Session, survey_id: str, tenant_id: str) -> DegradationSurvey:
    s = (
        db.query(DegradationSurvey)
        .filter(DegradationSurvey.id == survey_id, DegradationSurvey.tenant_id == tenant_id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="劣化診断が見つかりません")
    return s


# ---------- Endpoints ----------

@router.get("")
def list_surveys(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """テナント内の劣化診断一覧（軽量：data/photos を含まない）。"""
    rows = (
        db.query(DegradationSurvey)
        .filter(DegradationSurvey.tenant_id == user.tenant_id)
        .order_by(DegradationSurvey.updated_at.desc())
        .all()
    )
    return [_serialize(s, heavy=False) for s in rows]


@router.post("", status_code=201)
def create_survey(
    body: SurveyUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = DegradationSurvey(
        tenant_id=user.tenant_id,
        created_by=user.id,
        property_name=body.property_name or "",
        address=body.address,
        overall_grade=body.overall_grade,
        inspector_name=body.inspector_name,
        survey_date=body.survey_date,
        status=body.status or "draft",
        data=body.data,
        photos=body.photos,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _serialize(s)


@router.get("/{survey_id}")
def get_survey(
    survey_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """1件の完全データ（data/photos を含む）。"""
    return _serialize(_get_or_404(db, survey_id, user.tenant_id))


@router.put("/{survey_id}")
def update_survey(
    survey_id: str,
    body: SurveyUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = _get_or_404(db, survey_id, user.tenant_id)
    patch = body.model_dump(exclude_unset=True)
    for field in _UPDATABLE:
        if field in patch:
            val = patch[field]
            # data / photos は明示的な null による全消去を防ぐ（部分更新を壊さない）
            if field in ("data", "photos") and val is None:
                continue
            setattr(s, field, val)
    db.commit()
    db.refresh(s)
    return _serialize(s)


@router.delete("/{survey_id}")
def delete_survey(
    survey_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = _get_or_404(db, survey_id, user.tenant_id)
    db.delete(s)
    db.commit()
    return {"detail": "削除しました"}
