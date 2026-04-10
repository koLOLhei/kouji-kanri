"""Phase (工程) router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.phase import Phase, PhaseRequirement
from models.photo import Photo
from models.report import Report
from models.spec import SpecChapter
from models.user import User
from schemas.phase import PhaseCreate, PhaseUpdate, PhaseResponse, RequirementCreate, RequirementResponse
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/phases", tags=["phases"])


def _verify_project(project_id: str, user: User, db: Session) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")
    return project


@router.get("", response_model=list[PhaseResponse])
def list_phases(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _verify_project(project_id, user, db)
    phases = db.query(Phase).filter(
        Phase.project_id == project_id
    ).order_by(Phase.sort_order).all()

    result = []
    for p in phases:
        resp = PhaseResponse.model_validate(p)
        reqs = db.query(PhaseRequirement).filter_by(phase_id=p.id).all()
        met = 0
        for req in reqs:
            if req.requirement_type == "photo":
                count = db.query(Photo).filter_by(requirement_id=req.id).count()
            else:
                count = db.query(Report).filter_by(requirement_id=req.id).count()
            if count >= req.min_count:
                met += 1
        resp.requirements_total = len(reqs)
        resp.requirements_met = met
        result.append(resp)
    return result


@router.post("", response_model=PhaseResponse)
def create_phase(
    project_id: str,
    req: PhaseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _verify_project(project_id, user, db)
    phase = Phase(project_id=project_id, **req.model_dump())
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return PhaseResponse.model_validate(phase)


@router.post("/init-from-spec")
def init_phases_from_spec(
    project_id: str,
    spec_code: str = "kokyo_r7",
    chapters: list[int] | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """仕様書の章構成から工程を自動生成"""
    project = _verify_project(project_id, user, db)

    q = db.query(SpecChapter).filter(SpecChapter.spec_code == spec_code)
    if chapters:
        q = q.filter(SpecChapter.chapter_number.in_(chapters))
    spec_chapters = q.order_by(SpecChapter.sort_order).all()

    created = []
    for sc in spec_chapters:
        code = f"CH{sc.chapter_number:02d}"
        if sc.section_number:
            code += f"-{sc.section_number:02d}"

        phase = Phase(
            project_id=project_id,
            spec_chapter_id=sc.id,
            name=sc.title,
            phase_code=code,
            sort_order=sc.sort_order,
        )
        db.add(phase)
        db.flush()

        # 章レベルの必要書類を要件として追加
        if sc.required_documents:
            for i, doc_name in enumerate(sc.required_documents):
                req_type = "photo" if "写真" in doc_name else "report"
                requirement = PhaseRequirement(
                    phase_id=phase.id,
                    requirement_type=req_type,
                    name=doc_name,
                    min_count=1,
                    sort_order=i,
                )
                db.add(requirement)

        created.append({"id": phase.id, "name": phase.name, "code": code})

    db.commit()
    return {"status": "ok", "created": len(created), "phases": created}


@router.get("/{phase_id}", response_model=PhaseResponse)
def get_phase(
    project_id: str,
    phase_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _verify_project(project_id, user, db)
    phase = db.query(Phase).filter(Phase.id == phase_id, Phase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="工程が見つかりません")
    return PhaseResponse.model_validate(phase)


@router.put("/{phase_id}", response_model=PhaseResponse)
def update_phase(
    project_id: str,
    phase_id: str,
    req: PhaseUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _verify_project(project_id, user, db)
    phase = db.query(Phase).filter(Phase.id == phase_id, Phase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="工程が見つかりません")

    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(phase, key, value)
    db.commit()
    db.refresh(phase)
    return PhaseResponse.model_validate(phase)


@router.get("/{phase_id}/checklist", response_model=list[RequirementResponse])
def get_checklist(
    project_id: str,
    phase_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """工程の必要書類チェックリスト"""
    _verify_project(project_id, user, db)
    reqs = db.query(PhaseRequirement).filter_by(phase_id=phase_id).order_by(PhaseRequirement.sort_order).all()

    result = []
    for req in reqs:
        resp = RequirementResponse.model_validate(req)
        if req.requirement_type == "photo":
            resp.fulfilled_count = db.query(Photo).filter_by(requirement_id=req.id).count()
        else:
            resp.fulfilled_count = db.query(Report).filter_by(requirement_id=req.id).count()
        result.append(resp)
    return result


@router.post("/{phase_id}/requirements", response_model=RequirementResponse)
def add_requirement(
    project_id: str,
    phase_id: str,
    req: RequirementCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _verify_project(project_id, user, db)
    requirement = PhaseRequirement(phase_id=phase_id, **req.model_dump())
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    return RequirementResponse.model_validate(requirement)
