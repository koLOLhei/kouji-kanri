"""材料承認願 + 近隣対策 + 週休2日 router"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.staffing import MaterialApproval, NeighborRecord, WeeklyRestDay
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}", tags=["project-extras"])


# ─── 材料承認願 ───

class MaterialApprovalCreate(BaseModel):
    material_name: str
    specification: str | None = None
    manufacturer: str | None = None
    product_name: str | None = None
    usage_location: str | None = None
    quantity: str | None = None
    notes: str | None = None

class MaterialApprovalUpdate(BaseModel):
    status: str | None = None
    approved_by: str | None = None
    conditions: str | None = None
    notes: str | None = None

@router.get("/material-approvals")
def list_material_approvals(project_id: str, status: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    q = db.query(MaterialApproval).filter(MaterialApproval.project_id == project_id)
    if status:
        q = q.filter(MaterialApproval.status == status)
    return q.order_by(MaterialApproval.created_at.desc()).all()

@router.post("/material-approvals")
def create_material_approval(project_id: str, req: MaterialApprovalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    count = db.query(func.count(MaterialApproval.id)).filter(MaterialApproval.project_id == project_id).scalar()
    ma = MaterialApproval(project_id=project_id, approval_number=f"MA-{count+1:03d}", **req.model_dump())
    db.add(ma)
    db.commit()
    db.refresh(ma)
    return ma

@router.put("/material-approvals/{ma_id}")
def update_material_approval(project_id: str, ma_id: str, req: MaterialApprovalUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    ma = db.query(MaterialApproval).filter(MaterialApproval.id == ma_id, MaterialApproval.project_id == project_id).first()
    if not ma:
        raise HTTPException(status_code=404, detail="材料承認願が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(ma, k, v)
    if req.status == "approved":
        ma.approved_date = date.today()
    db.commit()
    db.refresh(ma)
    return ma


# ─── 近隣対策 ───

class NeighborCreate(BaseModel):
    record_type: str
    record_date: date
    resident_name: str | None = None
    address: str | None = None
    content: str | None = None
    response: str | None = None
    notes: str | None = None

@router.get("/neighbor-records")
def list_neighbor_records(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    return db.query(NeighborRecord).filter(NeighborRecord.project_id == project_id).order_by(NeighborRecord.record_date.desc()).all()

@router.post("/neighbor-records")
def create_neighbor_record(project_id: str, req: NeighborCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    nr = NeighborRecord(project_id=project_id, handled_by=user.id, **req.model_dump())
    db.add(nr)
    db.commit()
    db.refresh(nr)
    return nr

@router.put("/neighbor-records/{nr_id}")
def update_neighbor_record(project_id: str, nr_id: str, status: str | None = None, response: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    nr = db.query(NeighborRecord).filter(NeighborRecord.id == nr_id, NeighborRecord.project_id == project_id).first()
    if not nr:
        raise HTTPException(status_code=404, detail="近隣記録が見つかりません")
    if status:
        nr.status = status
        if status == "resolved":
            nr.resolved_date = date.today()
    if response:
        nr.response = response
    db.commit()
    return nr


# ─── 週休2日 ───

class WeeklyRestDayCreate(BaseModel):
    year_month: str
    total_days: int
    working_days: int
    rest_days: int
    rain_days: int = 0
    notes: str | None = None

@router.get("/weekly-rest-days")
def list_weekly_rest_days(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    return db.query(WeeklyRestDay).filter(WeeklyRestDay.project_id == project_id).order_by(WeeklyRestDay.year_month.desc()).all()

@router.post("/weekly-rest-days")
def create_weekly_rest_day(project_id: str, req: WeeklyRestDayCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    rest_rate = round(req.rest_days / req.total_days * 100, 1) if req.total_days > 0 else 0
    four_week = req.rest_days >= 8  # 4週8休の基準
    wr = WeeklyRestDay(
        project_id=project_id,
        rest_day_rate=rest_rate,
        four_week_eight_rest=four_week,
        **req.model_dump(),
    )
    db.add(wr)
    db.commit()
    db.refresh(wr)
    return wr

@router.get("/weekly-rest-days/summary")
def weekly_rest_summary(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verify_project_access(project_id, user, db)
    records = db.query(WeeklyRestDay).filter(WeeklyRestDay.project_id == project_id).all()
    if not records:
        return {"months": 0, "avg_rest_rate": 0, "four_week_eight_rest_achieved": 0}
    avg_rate = round(sum(r.rest_day_rate or 0 for r in records) / len(records), 1)
    achieved = sum(1 for r in records if r.four_week_eight_rest)
    return {
        "months": len(records),
        "avg_rest_rate": avg_rate,
        "four_week_eight_rest_achieved": achieved,
        "four_week_eight_rest_rate": round(achieved / len(records) * 100, 1),
    }
