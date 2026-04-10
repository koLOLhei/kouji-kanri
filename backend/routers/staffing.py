"""人員配置管理 (山積み・山崩し) router."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.staffing import StaffAssignment
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

tenant_router = APIRouter(prefix="/api/staffing", tags=["staffing"])
project_router = APIRouter(prefix="/api/projects/{project_id}/staffing", tags=["staffing"])


# ---------- Schemas ----------

class StaffAssignmentCreate(BaseModel):
    worker_name: str
    user_id: str | None = None
    worker_id: str | None = None
    role: str
    allocation_percent: int = 100
    start_date: date
    end_date: date | None = None
    daily_cost: int | None = None
    notes: str | None = None


class StaffAssignmentUpdate(BaseModel):
    worker_name: str | None = None
    role: str | None = None
    allocation_percent: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    daily_cost: int | None = None
    notes: str | None = None


# ---------- Tenant-wide endpoints ----------

@tenant_router.get("/assignments")
def list_all_assignments(
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """全案件横断の人員配置一覧"""
    assignments = db.query(StaffAssignment).filter(
        StaffAssignment.tenant_id == user.tenant_id
    ).order_by(StaffAssignment.start_date).all()

    project_ids = list({a.project_id for a in assignments})
    projects = db.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
    project_map = {p.id: p.name for p in projects}

    return [
        {
            "id": a.id,
            "worker_name": a.worker_name,
            "role": a.role,
            "project_id": a.project_id,
            "project_name": project_map.get(a.project_id, ""),
            "allocation_percent": a.allocation_percent,
            "start_date": a.start_date.isoformat(),
            "end_date": a.end_date.isoformat() if a.end_date else None,
        }
        for a in assignments
    ]


@tenant_router.get("/mountain-chart")
def mountain_chart(
    start: date,
    end: date,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """山積み: 日別の人員数を返す"""
    assignments = db.query(StaffAssignment).filter(
        StaffAssignment.tenant_id == user.tenant_id,
        StaffAssignment.start_date <= end,
    ).all()
    # Filter to assignments overlapping the range
    assignments = [
        a for a in assignments
        if a.end_date is None or a.end_date >= start
    ]

    project_ids = list({a.project_id for a in assignments})
    projects = db.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
    project_map = {p.id: p.name for p in projects}

    result = []
    current = start
    while current <= end:
        day_assignments = [
            a for a in assignments
            if a.start_date <= current and (a.end_date is None or a.end_date >= current)
        ]
        # Group by project
        by_project: dict[str, int] = {}
        for a in day_assignments:
            by_project[a.project_id] = by_project.get(a.project_id, 0) + 1

        result.append({
            "date": current.isoformat(),
            "count": len(day_assignments),
            "projects": [
                {"name": project_map.get(pid, ""), "count": cnt}
                for pid, cnt in by_project.items()
            ],
        })
        current += timedelta(days=1)

    return result


# ---------- Project-scoped endpoints ----------

@project_router.get("/assignments")
def list_project_assignments(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(StaffAssignment).filter(
        StaffAssignment.project_id == project_id
    ).order_by(StaffAssignment.start_date).all()


@project_router.post("/assignments")
def create_assignment(
    project_id: str, req: StaffAssignmentCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    a = StaffAssignment(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@project_router.put("/assignments/{assignment_id}")
def update_assignment(
    project_id: str, assignment_id: str, req: StaffAssignmentUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    a = db.query(StaffAssignment).filter(
        StaffAssignment.id == assignment_id,
        StaffAssignment.project_id == project_id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="配置が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@project_router.delete("/assignments/{assignment_id}")
def delete_assignment(
    project_id: str, assignment_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    a = db.query(StaffAssignment).filter(
        StaffAssignment.id == assignment_id,
        StaffAssignment.project_id == project_id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="配置が見つかりません")
    db.delete(a)
    db.commit()
    return {"status": "ok"}
