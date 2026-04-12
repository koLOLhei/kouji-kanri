"""工種別管理 + 内外製振り分け + 実行予算 + 出来高 + 瑕疵管理 + 粗利ダッシュボード"""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.work_package import WorkPackage, MonthlyProgress, DefectRecord
from models.subcontractor import Subcontractor
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}", tags=["work-packages"])


# ─── Schemas ───

class WorkPackageCreate(BaseModel):
    name: str
    trade_code: str | None = None
    category: str  # architecture, electrical, mechanical, plumbing, civil, other
    allocation: str = "undecided"  # in_house, outsource, mixed
    subcontractor_id: str | None = None
    manager_name: str | None = None
    budget_amount: int = Field(default=0, ge=0)
    contract_amount: int | None = Field(default=None, ge=0)
    planned_start: date | None = None
    planned_end: date | None = None
    sort_order: int = 0
    notes: str | None = None

class WorkPackageUpdate(BaseModel):
    name: str | None = None
    allocation: str | None = None
    subcontractor_id: str | None = None
    manager_name: str | None = None
    budget_amount: int | None = Field(default=None, ge=0)
    contract_amount: int | None = Field(default=None, ge=0)
    actual_cost: int | None = Field(default=None, ge=0)
    progress_percent: int | None = Field(default=None, ge=0, le=100)
    planned_start: date | None = None
    planned_end: date | None = None
    actual_start: date | None = None
    actual_end: date | None = None
    notes: str | None = None

class MonthlyProgressCreate(BaseModel):
    year_month: str  # '2026-04'
    work_package_id: str | None = None
    progress_percent: int = 0
    progress_amount: int = 0
    payment_amount: int = 0
    notes: str | None = None

class DefectCreate(BaseModel):
    title: str
    location: str | None = None
    work_package_id: str | None = None
    reported_date: date
    reported_by: str | None = None
    description: str | None = None
    cause: str | None = None
    repair_method: str | None = None
    repair_cost: int | None = None
    responsible_party: str = "contractor"
    assigned_to: str | None = None
    due_date: date | None = None
    warranty_period_end: date | None = None
    notes: str | None = None

class DefectUpdate(BaseModel):
    description: str | None = None
    cause: str | None = None
    repair_method: str | None = None
    repair_cost: int | None = None
    responsible_party: str | None = None
    assigned_to: str | None = None
    due_date: date | None = None
    completed_date: date | None = None
    status: str | None = None
    notes: str | None = None


# ─── 工種管理 ───

@router.get("/work-packages")
def list_work_packages(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    packages = db.query(WorkPackage).filter(
        WorkPackage.project_id == project_id
    ).order_by(WorkPackage.sort_order).all()
    result = []
    for wp in packages:
        d = {c.name: getattr(wp, c.name) for c in wp.__table__.columns}
        # 外注先名を解決
        if wp.subcontractor_id:
            sub = db.query(Subcontractor).filter(Subcontractor.id == wp.subcontractor_id).first()
            d["subcontractor_name"] = sub.company_name if sub else None
        else:
            d["subcontractor_name"] = None
        # 利益
        d["profit"] = wp.budget_amount - wp.actual_cost
        d["profit_rate"] = round((wp.budget_amount - wp.actual_cost) / wp.budget_amount * 100, 1) if wp.budget_amount > 0 else 0
        result.append(d)
    return result

@router.post("/work-packages")
def create_work_package(
    project_id: str, req: WorkPackageCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    wp = WorkPackage(project_id=project_id, **req.model_dump())
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return wp

@router.put("/work-packages/{wp_id}")
def update_work_package(
    project_id: str, wp_id: str, req: WorkPackageUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    wp = db.query(WorkPackage).filter(WorkPackage.id == wp_id, WorkPackage.project_id == project_id).first()
    if not wp:
        raise HTTPException(status_code=404, detail="工種が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(wp, k, v)
    db.commit()
    db.refresh(wp)
    return wp


# ─── 粗利ダッシュボード ───

@router.get("/profit-dashboard")
def profit_dashboard(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """受注額 - 実行予算 - 実績原価を一目で可視化"""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    packages = db.query(WorkPackage).filter(WorkPackage.project_id == project_id).all()

    contract_amount = project.contract_amount or 0  # 受注額
    total_budget = sum(wp.budget_amount for wp in packages)  # 実行予算合計
    total_actual = sum(wp.actual_cost for wp in packages)  # 実績原価合計
    total_outsource = sum(wp.contract_amount or 0 for wp in packages if wp.allocation == "outsource")

    gross_profit_budget = contract_amount - total_budget  # 予定粗利
    gross_profit_actual = contract_amount - total_actual  # 現時点粗利
    gross_profit_rate_budget = round(gross_profit_budget / contract_amount * 100, 1) if contract_amount > 0 else 0
    gross_profit_rate_actual = round(gross_profit_actual / contract_amount * 100, 1) if contract_amount > 0 else 0

    # 工種別内訳
    by_category = {}
    for wp in packages:
        cat = wp.category
        if cat not in by_category:
            by_category[cat] = {"budget": 0, "actual": 0, "outsource": 0, "in_house": 0}
        by_category[cat]["budget"] += wp.budget_amount
        by_category[cat]["actual"] += wp.actual_cost
        if wp.allocation == "outsource":
            by_category[cat]["outsource"] += wp.contract_amount or 0
        else:
            by_category[cat]["in_house"] += wp.budget_amount

    # 内外製比率
    in_house_count = sum(1 for wp in packages if wp.allocation == "in_house")
    outsource_count = sum(1 for wp in packages if wp.allocation == "outsource")
    mixed_count = sum(1 for wp in packages if wp.allocation == "mixed")

    return {
        "contract_amount": contract_amount,
        "total_budget": total_budget,
        "total_actual": total_actual,
        "total_outsource_contract": total_outsource,
        "gross_profit_budget": gross_profit_budget,
        "gross_profit_actual": gross_profit_actual,
        "gross_profit_rate_budget": gross_profit_rate_budget,
        "gross_profit_rate_actual": gross_profit_rate_actual,
        "budget_remaining": total_budget - total_actual,
        "budget_consumption_rate": round(total_actual / total_budget * 100, 1) if total_budget > 0 else 0,
        "by_category": by_category,
        "allocation_summary": {
            "in_house": in_house_count,
            "outsource": outsource_count,
            "mixed": mixed_count,
            "undecided": len(packages) - in_house_count - outsource_count - mixed_count,
        },
        "work_packages": [
            {
                "id": wp.id, "name": wp.name, "category": wp.category,
                "allocation": wp.allocation, "budget": wp.budget_amount,
                "actual": wp.actual_cost, "progress": wp.progress_percent,
                "profit": wp.budget_amount - wp.actual_cost,
                "profit_rate": round((wp.budget_amount - wp.actual_cost) / wp.budget_amount * 100, 1) if wp.budget_amount > 0 else 0,
            }
            for wp in packages
        ],
    }


# ─── 出来高査定 ───

@router.get("/monthly-progress")
def list_monthly_progress(
    project_id: str,
    year_month: str | None = None,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(MonthlyProgress).filter(MonthlyProgress.project_id == project_id)
    if year_month:
        q = q.filter(MonthlyProgress.year_month == year_month)
    return q.order_by(MonthlyProgress.year_month.desc()).all()

@router.post("/monthly-progress")
def create_monthly_progress(
    project_id: str, req: MonthlyProgressCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    mp = MonthlyProgress(project_id=project_id, assessed_by=user.id, **req.model_dump())
    db.add(mp)
    db.commit()
    db.refresh(mp)
    return mp

@router.get("/monthly-progress/summary")
def monthly_progress_summary(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """月別の累計出来高推移"""
    records = db.query(MonthlyProgress).filter(
        MonthlyProgress.project_id == project_id
    ).order_by(MonthlyProgress.year_month).all()

    monthly = {}
    for r in records:
        ym = r.year_month
        if ym not in monthly:
            monthly[ym] = {"progress_amount": 0, "payment_amount": 0}
        monthly[ym]["progress_amount"] += r.progress_amount
        monthly[ym]["payment_amount"] += r.payment_amount

    # 累計計算
    cumulative = []
    cum_progress = 0
    cum_payment = 0
    for ym in sorted(monthly.keys()):
        cum_progress += monthly[ym]["progress_amount"]
        cum_payment += monthly[ym]["payment_amount"]
        cumulative.append({
            "year_month": ym,
            "monthly_progress": monthly[ym]["progress_amount"],
            "monthly_payment": monthly[ym]["payment_amount"],
            "cumulative_progress": cum_progress,
            "cumulative_payment": cum_payment,
        })
    return cumulative


# ─── 瑕疵管理 ───

@router.get("/defects")
def list_defects(
    project_id: str,
    status: str | None = None,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(DefectRecord).filter(DefectRecord.project_id == project_id)
    if status:
        q = q.filter(DefectRecord.status == status)
    return q.order_by(DefectRecord.reported_date.desc()).all()

@router.post("/defects")
def create_defect(
    project_id: str, req: DefectCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    # Auto-number
    count = db.query(func.count(DefectRecord.id)).filter(DefectRecord.project_id == project_id).scalar()
    defect = DefectRecord(
        project_id=project_id,
        defect_number=f"DEF-{count + 1:03d}",
        **req.model_dump(),
    )
    db.add(defect)
    db.commit()
    db.refresh(defect)
    return defect

@router.put("/defects/{defect_id}")
def update_defect(
    project_id: str, defect_id: str, req: DefectUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    defect = db.query(DefectRecord).filter(DefectRecord.id == defect_id, DefectRecord.project_id == project_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="瑕疵記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(defect, k, v)
    db.commit()
    db.refresh(defect)
    return defect


# ─── プロジェクトライフサイクル管理 ───

LIFECYCLE_ORDER = [
    "estimate",      # 見積中
    "bidding",       # 入札中
    "awarded",       # 受注
    "preparation",   # 工事準備
    "active",        # 施工中
    "inspection",    # 完了検査
    "handover",      # 引渡
    "warranty",      # 瑕疵担保期間
    "closed",        # 完了
]

LIFECYCLE_LABELS = {
    "estimate": "見積中", "bidding": "入札中", "awarded": "受注",
    "preparation": "工事準備", "active": "施工中", "inspection": "完了検査",
    "handover": "引渡", "warranty": "瑕疵担保期間", "closed": "完了",
    "planning": "計画中",  # 後方互換
}

@router.put("/lifecycle")
def update_lifecycle(
    project_id: str,
    new_status: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """プロジェクトのステータスを次のフェーズに進める"""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    if new_status not in LIFECYCLE_ORDER and new_status != "planning":
        raise HTTPException(status_code=400, detail=f"無効なステータス: {new_status}")

    project.status = new_status
    db.commit()
    return {"status": new_status, "label": LIFECYCLE_LABELS.get(new_status, new_status)}

@router.get("/lifecycle")
def get_lifecycle(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """現在のライフサイクルステージと全ステージ一覧"""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    current = project.status
    current_idx = LIFECYCLE_ORDER.index(current) if current in LIFECYCLE_ORDER else -1

    stages = []
    for i, stage in enumerate(LIFECYCLE_ORDER):
        if i < current_idx:
            state = "completed"
        elif i == current_idx:
            state = "current"
        else:
            state = "upcoming"
        stages.append({"key": stage, "label": LIFECYCLE_LABELS[stage], "state": state})

    return {
        "current_status": current,
        "current_label": LIFECYCLE_LABELS.get(current, current),
        "stages": stages,
    }
