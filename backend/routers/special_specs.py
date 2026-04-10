"""特記仕様書管理 (Special Specification) router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.instruction import SpecialSpecification
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/special-specs", tags=["special-specs"])


# ---------- Schemas ----------

class SpecialSpecCreate(BaseModel):
    title: str
    chapter_ref: str | None = None
    content_summary: str | None = None
    file_key: str | None = None
    priority: int = 3
    sort_order: int = 0


class SpecialSpecUpdate(BaseModel):
    title: str | None = None
    chapter_ref: str | None = None
    content_summary: str | None = None
    file_key: str | None = None
    priority: int | None = None
    sort_order: int | None = None


# ---------- Endpoints ----------

@router.get("")
def list_special_specs(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    return (
        db.query(SpecialSpecification)
        .filter(SpecialSpecification.project_id == project_id)
        .order_by(SpecialSpecification.priority, SpecialSpecification.sort_order)
        .all()
    )


@router.post("", status_code=201)
def create_special_spec(
    project_id: str,
    body: SpecialSpecCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = SpecialSpecification(project_id=project_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/priority-list")
def priority_list(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    """仕様書1.1.1(4) 優先順位: 1=質問回答書, 2=現場説明書, 3=特記仕様書, 4=図面, 5=標準仕様書"""
    rows = (
        db.query(SpecialSpecification)
        .filter(SpecialSpecification.project_id == project_id)
        .order_by(SpecialSpecification.priority, SpecialSpecification.sort_order)
        .all()
    )
    priority_labels = {
        1: "質問回答書（最優先）",
        2: "現場説明書",
        3: "特記仕様書",
        4: "図面",
        5: "標準仕様書（最低）",
    }
    grouped: dict[int, list] = {}
    for r in rows:
        grouped.setdefault(r.priority, []).append(r)

    return {
        "description": "仕様書1.1.1(4) 優先順位",
        "groups": [
            {
                "priority": p,
                "label": priority_labels.get(p, f"優先度{p}"),
                "items": grouped.get(p, []),
            }
            for p in sorted(priority_labels.keys())
        ],
    }


@router.get("/{spec_id}")
def get_special_spec(
    project_id: str,
    spec_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(SpecialSpecification).filter(
        SpecialSpecification.id == spec_id,
        SpecialSpecification.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="特記仕様書が見つかりません")
    return record


@router.put("/{spec_id}")
def update_special_spec(
    project_id: str,
    spec_id: str,
    body: SpecialSpecUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(SpecialSpecification).filter(
        SpecialSpecification.id == spec_id,
        SpecialSpecification.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="特記仕様書が見つかりません")

    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{spec_id}", status_code=204)
def delete_special_spec(
    project_id: str,
    spec_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(SpecialSpecification).filter(
        SpecialSpecification.id == spec_id,
        SpecialSpecification.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="特記仕様書が見つかりません")
    db.delete(record)
    db.commit()
