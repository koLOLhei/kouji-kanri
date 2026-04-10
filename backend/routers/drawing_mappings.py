"""図面と工程の連動マッピング router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.instruction import DrawingPhaseMapping
from models.drawing import Drawing
from models.phase import Phase
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/drawing-mappings", tags=["drawing-mappings"])


# ---------- Schemas ----------

class DrawingMappingCreate(BaseModel):
    drawing_id: str
    phase_id: str
    notes: str | None = None


# ---------- Endpoints ----------

@router.get("")
def list_drawing_mappings(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    rows = (
        db.query(
            DrawingPhaseMapping,
            Drawing.title.label("drawing_title"),
            Phase.name.label("phase_name"),
        )
        .outerjoin(Drawing, Drawing.id == DrawingPhaseMapping.drawing_id)
        .outerjoin(Phase, Phase.id == DrawingPhaseMapping.phase_id)
        .filter(DrawingPhaseMapping.project_id == project_id)
        .all()
    )
    result = []
    for mapping, drawing_title, phase_name in rows:
        result.append({
            "id": mapping.id,
            "drawing_id": mapping.drawing_id,
            "phase_id": mapping.phase_id,
            "project_id": mapping.project_id,
            "notes": mapping.notes,
            "drawing_title": drawing_title,
            "phase_name": phase_name,
            "created_at": mapping.created_at,
        })
    return result


@router.post("", status_code=201)
def create_drawing_mapping(
    project_id: str,
    body: DrawingMappingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = DrawingPhaseMapping(
        project_id=project_id,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{mapping_id}", status_code=204)
def delete_drawing_mapping(
    project_id: str,
    mapping_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(DrawingPhaseMapping).filter(
        DrawingPhaseMapping.id == mapping_id,
        DrawingPhaseMapping.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="マッピングが見つかりません")
    db.delete(record)
    db.commit()
