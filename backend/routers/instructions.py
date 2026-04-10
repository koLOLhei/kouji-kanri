"""下請指示書・連絡書 (Subcontractor Instruction) router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.instruction import SubcontractorInstruction
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/instructions", tags=["instructions"])


# ---------- Schemas ----------

class InstructionCreate(BaseModel):
    instruction_type: str
    to_company_id: str | None = None
    to_company_name: str | None = None
    subject: str
    content: str | None = None
    deadline: date | None = None
    response_required: bool = False
    attachment_keys: dict | None = None


class InstructionUpdate(BaseModel):
    subject: str | None = None
    content: str | None = None
    deadline: date | None = None
    response_required: bool | None = None
    response_received: bool | None = None
    response_content: str | None = None
    attachment_keys: dict | None = None


# ---------- Endpoints ----------

@router.get("")
def list_instructions(
    project_id: str,
    instruction_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    q = db.query(SubcontractorInstruction).filter(SubcontractorInstruction.project_id == project_id)
    if instruction_type:
        q = q.filter(SubcontractorInstruction.instruction_type == instruction_type)
    return q.order_by(SubcontractorInstruction.created_at.desc()).all()


@router.post("", status_code=201)
def create_instruction(
    project_id: str,
    body: InstructionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    # Auto-number: count existing + 1
    count = db.query(func.count(SubcontractorInstruction.id)).filter(
        SubcontractorInstruction.project_id == project_id,
        SubcontractorInstruction.instruction_type == body.instruction_type,
    ).scalar() or 0

    type_prefix_map = {
        "instruction": "指示",
        "notice": "連絡",
        "request": "依頼",
        "warning": "注意",
    }
    prefix = type_prefix_map.get(body.instruction_type, body.instruction_type)
    instruction_number = f"{prefix}-{count + 1:04d}"

    record = SubcontractorInstruction(
        project_id=project_id,
        instruction_number=instruction_number,
        issued_by=user.id,
        issued_date=date.today(),
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{instruction_id}")
def get_instruction(
    project_id: str,
    instruction_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(SubcontractorInstruction).filter(
        SubcontractorInstruction.id == instruction_id,
        SubcontractorInstruction.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="指示書が見つかりません")
    return record


@router.put("/{instruction_id}")
def update_instruction(
    project_id: str,
    instruction_id: str,
    body: InstructionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    verify_project_access(project_id, user, db)
    record = db.query(SubcontractorInstruction).filter(
        SubcontractorInstruction.id == instruction_id,
        SubcontractorInstruction.project_id == project_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="指示書が見つかりません")

    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    db.commit()
    db.refresh(record)
    return record
