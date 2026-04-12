"""Project (案件) router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.project import Project
from models.phase import Phase
from models.user import User
from schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.plan_service import check_project_limit

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
def list_projects(
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Project).filter(Project.tenant_id == user.tenant_id)
    if status:
        q = q.filter(Project.status == status)
    else:
        # A7: Exclude soft-deleted projects from default listing
        q = q.filter(Project.status != "deleted")
    projects = q.order_by(Project.created_at.desc()).all()

    # Subquery: phase counts (N+1クエリ回避)
    from sqlalchemy import case
    phase_counts = db.query(
        Phase.project_id,
        func.count(Phase.id).label("total"),
        func.count(case((Phase.status == "completed", Phase.id))).label("completed"),
    ).group_by(Phase.project_id).subquery()

    result = []
    for p in projects:
        resp = ProjectResponse.model_validate(p)
        row = db.query(phase_counts).filter(phase_counts.c.project_id == p.id).first()
        resp.phase_count = row.total if row else 0
        resp.completed_phases = row.completed if row else 0
        result.append(resp)
    return result


@router.post("", response_model=ProjectResponse)
def create_project(
    req: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Enforce plan project limit
    check_project_limit(db, user.tenant_id)

    project = Project(
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id,
        Project.status != "deleted",  # A7: block access to soft-deleted projects
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    total = db.query(func.count(Phase.id)).filter(Phase.project_id == project.id).scalar()
    completed = db.query(func.count(Phase.id)).filter(
        Phase.project_id == project.id, Phase.status == "completed"
    ).scalar()
    resp = ProjectResponse.model_validate(project)
    resp.phase_count = total
    resp.completed_phases = completed
    return resp


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    req: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")
    project.status = "deleted"
    # A7: Cascade soft-delete to phases so their data is not returned via other queries.
    # We update status to "archived" to distinguish from normal completed/cancelled phases.
    db.query(Phase).filter(
        Phase.project_id == project_id, Phase.status != "deleted"
    ).update({"status": "archived"}, synchronize_session=False)
    db.commit()
    return {"status": "ok"}
