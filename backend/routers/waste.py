"""Waste manifest (産廃マニフェスト) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.waste import WasteManifest
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/waste-manifests", tags=["waste-manifests"])

# Valid status transitions
_STATUS_FLOW = {
    "issued": "collected",
    "collected": "disposed",
    "disposed": "final_disposed",
    "final_disposed": "completed",
}


# ---------- Schemas ----------

class WasteManifestCreate(BaseModel):
    manifest_number: str
    waste_type: str
    waste_category: str  # general_industrial / special_industrial
    quantity: float | None = None
    unit: str | None = None
    collector_name: str | None = None
    collector_license: str | None = None
    disposal_name: str | None = None
    disposal_license: str | None = None
    disposal_method: str | None = None
    issued_date: date | None = None
    collected_date: date | None = None
    disposed_date: date | None = None
    final_disposed_date: date | None = None
    status: str = "issued"


class WasteManifestUpdate(BaseModel):
    manifest_number: str | None = None
    waste_type: str | None = None
    waste_category: str | None = None
    quantity: float | None = None
    unit: str | None = None
    collector_name: str | None = None
    collector_license: str | None = None
    disposal_name: str | None = None
    disposal_license: str | None = None
    disposal_method: str | None = None
    issued_date: date | None = None
    collected_date: date | None = None
    disposed_date: date | None = None
    final_disposed_date: date | None = None


class StatusUpdate(BaseModel):
    status: str  # next status in the flow


# ---------- Endpoints ----------

@router.get("")
def list_waste_manifests(
    project_id: str,
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(WasteManifest).filter(WasteManifest.project_id == project_id)
    if status:
        q = q.filter(WasteManifest.status == status)
    return q.order_by(WasteManifest.issued_date.desc()).all()


@router.post("")
def create_waste_manifest(
    project_id: str,
    req: WasteManifestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    manifest = WasteManifest(
        project_id=project_id,
        **req.model_dump(),
    )
    db.add(manifest)
    db.commit()
    db.refresh(manifest)
    return manifest


@router.get("/summary")
def waste_summary(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """Waste totals by type."""
    rows = (
        db.query(
            WasteManifest.waste_type,
            func.count(WasteManifest.id).label("count"),
            func.sum(WasteManifest.quantity).label("total_quantity"),
        )
        .filter(WasteManifest.project_id == project_id)
        .group_by(WasteManifest.waste_type)
        .all()
    )
    return [
        {"waste_type": r.waste_type, "count": r.count, "total_quantity": float(r.total_quantity or 0)}
        for r in rows
    ]


@router.get("/{manifest_id}")
def get_waste_manifest(
    project_id: str,
    manifest_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    manifest = db.query(WasteManifest).filter(
        WasteManifest.id == manifest_id, WasteManifest.project_id == project_id
    ).first()
    if not manifest:
        raise HTTPException(status_code=404, detail="マニフェストが見つかりません")
    return manifest


@router.put("/{manifest_id}")
def update_waste_manifest(
    project_id: str,
    manifest_id: str,
    req: WasteManifestUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    manifest = db.query(WasteManifest).filter(
        WasteManifest.id == manifest_id, WasteManifest.project_id == project_id
    ).first()
    if not manifest:
        raise HTTPException(status_code=404, detail="マニフェストが見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(manifest, k, v)
    db.commit()
    db.refresh(manifest)
    return manifest


@router.put("/{manifest_id}/update-status")
def update_manifest_status(
    project_id: str,
    manifest_id: str,
    req: StatusUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """Update manifest status following the flow: issued -> collected -> disposed -> final_disposed -> completed."""
    manifest = db.query(WasteManifest).filter(
        WasteManifest.id == manifest_id, WasteManifest.project_id == project_id
    ).first()
    if not manifest:
        raise HTTPException(status_code=404, detail="マニフェストが見つかりません")

    expected_next = _STATUS_FLOW.get(manifest.status)
    if expected_next is None:
        raise HTTPException(status_code=400, detail="既に最終ステータスです")
    if req.status != expected_next:
        raise HTTPException(
            status_code=400,
            detail=f"ステータスは '{expected_next}' に更新してください（現在: {manifest.status}）",
        )

    manifest.status = req.status

    # Auto-fill date fields based on status transition
    today = date.today()
    if req.status == "collected" and not manifest.collected_date:
        manifest.collected_date = today
    elif req.status == "disposed" and not manifest.disposed_date:
        manifest.disposed_date = today
    elif req.status == "final_disposed" and not manifest.final_disposed_date:
        manifest.final_disposed_date = today

    db.commit()
    db.refresh(manifest)
    return manifest
