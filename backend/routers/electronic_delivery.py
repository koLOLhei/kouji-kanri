"""
Electronic delivery (電子納品) router.

Endpoints:
  GET  /api/projects/{id}/electronic-delivery/preview
  POST /api/projects/{id}/electronic-delivery/generate
  GET  /api/projects/{id}/electronic-delivery/photo-xml
  GET  /api/projects/{id}/electronic-delivery/validate
  GET  /api/electronic-delivery/photo-categories
  GET  /api/electronic-delivery/work-types
  GET  /api/electronic-delivery/work-types/{work_type}/subtypes
  GET  /api/electronic-delivery/work-types/{work_type}/subtypes/{subtype}/details
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.electronic_delivery import (
    generate_photo_xml,
    generate_index_xml,
    generate_meet_xml,
    build_delivery_package,
    preview_delivery,
    validate_delivery,
)
from services.photo_categories import (
    PHOTO_CATEGORIES,
    WORK_TYPE_TREE,
    get_subtypes,
    get_details,
)

import io

router = APIRouter(tags=["electronic-delivery"])

# ── Reference data (no auth required) ──────────────────────────────────────

@router.get("/api/electronic-delivery/photo-categories")
def list_photo_categories():
    """Return the standard 写真区分 list for frontend dropdowns."""
    return PHOTO_CATEGORIES


@router.get("/api/electronic-delivery/work-types")
def list_work_types():
    """Return the 工種 tree (with 種別 and 細別) for frontend dropdowns."""
    return WORK_TYPE_TREE


@router.get("/api/electronic-delivery/work-types/{work_type}/subtypes")
def list_subtypes(work_type: str):
    """Return 種別 list for a given 工種."""
    return get_subtypes(work_type)


@router.get("/api/electronic-delivery/work-types/{work_type}/subtypes/{subtype}/details")
def list_details(work_type: str, subtype: str):
    """Return 細別 list for a given 工種 + 種別."""
    return get_details(work_type, subtype)


# ── Project-scoped endpoints ────────────────────────────────────────────────

def _get_project_or_404(project_id: str, user: User, db: Session) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")
    return project


@router.get("/api/projects/{project_id}/electronic-delivery/preview")
def preview_electronic_delivery(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Preview what will be included in the electronic delivery package.
    Returns folder structure summary and validation results.
    """
    _get_project_or_404(project_id, user, db)
    try:
        return preview_delivery(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/projects/{project_id}/electronic-delivery/validate")
def validate_electronic_delivery(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validate the completeness of the electronic delivery package.
    Returns errors and warnings without generating any files.
    """
    _get_project_or_404(project_id, user, db)
    return validate_delivery(project_id, db)


@router.get("/api/projects/{project_id}/electronic-delivery/photo-xml")
def download_photo_xml(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download PHOTO.XML for the project.
    Conforms to デジタル写真管理情報基準 令和7年3月.
    """
    _get_project_or_404(project_id, user, db)
    try:
        xml_content = generate_photo_xml(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return Response(
        content=xml_content.encode("utf-8"),
        media_type="application/xml",
        headers={
            "Content-Disposition": "attachment; filename=PHOTO.XML",
            "Content-Type": "application/xml; charset=utf-8",
        },
    )


@router.get("/api/projects/{project_id}/electronic-delivery/index-xml")
def download_index_xml(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download INDEX_C.XML for the project.
    Conforms to 工事完成図書の電子納品等要領 令和7年3月.
    """
    _get_project_or_404(project_id, user, db)
    try:
        xml_content = generate_index_xml(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return Response(
        content=xml_content.encode("utf-8"),
        media_type="application/xml",
        headers={
            "Content-Disposition": "attachment; filename=INDEX_C.XML",
            "Content-Type": "application/xml; charset=utf-8",
        },
    )


@router.get("/api/projects/{project_id}/electronic-delivery/meet-xml")
def download_meet_xml(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download MEET.XML for the project (meeting minutes).
    """
    _get_project_or_404(project_id, user, db)
    try:
        xml_content = generate_meet_xml(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return Response(
        content=xml_content.encode("utf-8"),
        media_type="application/xml",
        headers={
            "Content-Disposition": "attachment; filename=MEET.XML",
            "Content-Type": "application/xml; charset=utf-8",
        },
    )


@router.post("/api/projects/{project_id}/electronic-delivery/generate")
def generate_delivery_package(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate the full electronic delivery ZIP package.

    The ZIP follows the CALS/EC folder structure:
      INDE_C/INDEX_C.XML
      PHOTO/PHOTO.XML
      PHOTO/PIC/*.JPG
      MEET/MEET.XML
      DRAWINGF/
      OTHRS/
    """
    project = _get_project_or_404(project_id, user, db)
    try:
        zip_bytes = build_delivery_package(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Build a safe filename from the project name/code
    safe_name = (project.project_code or project.id).replace("/", "-")
    filename = f"電子納品_{safe_name}.zip"

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
            "Content-Length": str(len(zip_bytes)),
        },
    )
