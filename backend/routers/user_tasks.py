"""個人タスク管理 (UserTask) router."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import UserTask
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ---------- Schemas ----------

class TaskCreate(BaseModel):
    project_id: str | None = None
    title: str
    description: str | None = None
    priority: str = "medium"
    due_date: date | None = None


class TaskUpdate(BaseModel):
    project_id: str | None = None
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    due_date: date | None = None
    completed: bool | None = None


# ---------- Endpoints ----------

@router.get("")
def list_tasks(
    completed: bool | None = None,
    project_id: str | None = None,
    priority: str | None = None,
    due_from: date | None = None,
    due_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(UserTask).filter(UserTask.user_id == user.id)
    if completed is not None:
        q = q.filter(UserTask.completed == completed)
    if project_id:
        q = q.filter(UserTask.project_id == project_id)
    if priority:
        q = q.filter(UserTask.priority == priority)
    if due_from:
        q = q.filter(UserTask.due_date >= due_from)
    if due_to:
        q = q.filter(UserTask.due_date <= due_to)
    return q.order_by(UserTask.due_date.asc().nullslast(), UserTask.created_at.desc()).all()


@router.post("", status_code=201)
def create_task(
    body: TaskCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = UserTask(
        tenant_id=user.tenant_id,
        user_id=user.id,
        **body.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/today")
def today_tasks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    return db.query(UserTask).filter(
        UserTask.user_id == user.id,
        UserTask.due_date == today,
        UserTask.completed == False,
    ).order_by(UserTask.priority.asc()).all()


@router.get("/overdue")
def overdue_tasks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    return db.query(UserTask).filter(
        UserTask.user_id == user.id,
        UserTask.due_date < today,
        UserTask.completed == False,
    ).order_by(UserTask.due_date.asc()).all()


@router.put("/{task_id}")
def update_task(
    task_id: str,
    body: TaskUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(UserTask).filter(
        UserTask.id == task_id,
        UserTask.user_id == user.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(UserTask).filter(
        UserTask.id == task_id,
        UserTask.user_id == user.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    db.delete(record)
    db.commit()
    return {"status": "ok"}


@router.put("/{task_id}/complete")
def complete_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(UserTask).filter(
        UserTask.id == task_id,
        UserTask.user_id == user.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    record.completed = True
    record.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record
