"""定期点検スケジュール管理 — 法定点検の一元管理・期限アラート"""

from datetime import date, datetime
from dateutil.relativedelta import relativedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.client_portal import InspectionScheduleTemplate
from models.user import User
from services.auth_service import get_current_user
from services.timezone_utils import today_jst

router = APIRouter(
    prefix="/api/facilities/{facility_id}/inspection-schedules",
    tags=["inspection-schedules"],
)


# ── 頻度→月数マッピング ────────────────────────────────────────────────────

FREQUENCY_MONTHS: dict[str, int] = {
    "monthly": 1,
    "bimonthly": 2,
    "quarterly": 3,
    "semi_annual": 6,
    "annual": 12,
    "biennial": 24,
}


# ── デフォルトテンプレート ─────────────────────────────────────────────────

DEFAULT_SCHEDULES = [
    {
        "name": "消防設備点検",
        "category": "fire",
        "frequency": "semi_annual",
        "legal_basis": "消防法第17条の3の3",
    },
    {
        "name": "受水槽清掃",
        "category": "water",
        "frequency": "annual",
        "legal_basis": "水道法第34条の2",
    },
    {
        "name": "エレベーター定期検査",
        "category": "elevator",
        "frequency": "annual",
        "legal_basis": "建築基準法第12条",
    },
    {
        "name": "電気工作物定期点検",
        "category": "electrical",
        "frequency": "annual",
        "legal_basis": "電気事業法第42条",
    },
]


# ── スキーマ ─────────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    name: str
    category: str = Field(
        ...,
        description="fire / water / elevator / electrical / hvac / building",
    )
    legal_basis: str | None = None
    frequency: str = Field(
        ...,
        description="monthly / bimonthly / quarterly / semi_annual / annual / biennial",
    )
    month_due: list[int] | None = None
    checklist_items: list | None = None
    assigned_company: str | None = None


class ScheduleUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    legal_basis: str | None = None
    frequency: str | None = None
    month_due: list[int] | None = None
    checklist_items: list | None = None
    assigned_company: str | None = None
    last_performed: date | None = None
    next_due: date | None = None
    is_active: bool | None = None
    notes: str | None = None


class CompleteRequest(BaseModel):
    performed_date: date
    notes: str | None = None


class ScheduleResponse(BaseModel):
    id: str
    facility_id: str
    name: str
    category: str
    legal_basis: str | None = None
    frequency: str
    month_due: list[int] | None = None
    checklist_items: list | None = None
    last_performed: date | None = None
    next_due: date | None = None
    assigned_company: str | None = None
    is_active: bool
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── ヘルパー ──────────────────────────────────────────────────────────────

def _calculate_next_due(performed_date: date, frequency: str) -> date:
    """実施日と頻度から次回予定日を計算"""
    months = FREQUENCY_MONTHS.get(frequency)
    if months is None:
        raise ValueError(f"未知の頻度: {frequency}")
    return performed_date + relativedelta(months=months)


def _seed_defaults_if_needed(
    db: Session, facility_id: str,
) -> None:
    """施設初回時にデフォルトの法定点検スケジュールを投入"""
    existing = db.query(InspectionScheduleTemplate).filter(
        InspectionScheduleTemplate.facility_id == facility_id,
    ).count()
    if existing > 0:
        return

    for tmpl in DEFAULT_SCHEDULES:
        schedule = InspectionScheduleTemplate(
            facility_id=facility_id,
            name=tmpl["name"],
            category=tmpl["category"],
            frequency=tmpl["frequency"],
            legal_basis=tmpl["legal_basis"],
        )
        db.add(schedule)
    db.flush()


# ── エンドポイント ─────────────────────────────────────────────────────────

@router.get("", response_model=list[ScheduleResponse])
def list_schedules(
    facility_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """施設に登録された全点検スケジュール"""
    schedules = db.query(InspectionScheduleTemplate).filter(
        InspectionScheduleTemplate.facility_id == facility_id,
    ).order_by(InspectionScheduleTemplate.next_due.asc().nullslast()).all()
    return schedules


@router.post("", response_model=ScheduleResponse)
def create_schedule(
    facility_id: str,
    req: ScheduleCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """点検スケジュールを新規作成（初回時はデフォルトも投入）"""

    if req.frequency not in FREQUENCY_MONTHS:
        raise HTTPException(
            status_code=400,
            detail=f"無効な頻度: {req.frequency}。有効値: {list(FREQUENCY_MONTHS.keys())}",
        )

    # 施設初回ならデフォルトスケジュールを投入
    _seed_defaults_if_needed(db, facility_id)

    schedule = InspectionScheduleTemplate(
        facility_id=facility_id,
        name=req.name,
        category=req.category,
        legal_basis=req.legal_basis,
        frequency=req.frequency,
        month_due=req.month_due,
        checklist_items=req.checklist_items,
        assigned_company=req.assigned_company,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    facility_id: str,
    schedule_id: str,
    req: ScheduleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """点検スケジュールを更新"""

    schedule = db.query(InspectionScheduleTemplate).filter(
        InspectionScheduleTemplate.id == schedule_id,
        InspectionScheduleTemplate.facility_id == facility_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="スケジュールが見つかりません")

    update_data = req.model_dump(exclude_unset=True)

    if "frequency" in update_data and update_data["frequency"] not in FREQUENCY_MONTHS:
        raise HTTPException(
            status_code=400,
            detail=f"無効な頻度: {update_data['frequency']}",
        )

    for field, value in update_data.items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/overdue", response_model=list[ScheduleResponse])
def list_overdue(
    facility_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """期限超過の点検スケジュール"""
    today = today_jst()
    schedules = db.query(InspectionScheduleTemplate).filter(
        InspectionScheduleTemplate.facility_id == facility_id,
        InspectionScheduleTemplate.is_active == True,
        InspectionScheduleTemplate.next_due < today,
    ).order_by(InspectionScheduleTemplate.next_due.asc()).all()
    return schedules


@router.get("/upcoming", response_model=list[ScheduleResponse])
def list_upcoming(
    facility_id: str,
    days: int = 30,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """N日以内に期限が来る点検スケジュール"""
    today = today_jst()
    cutoff = today + relativedelta(days=days)
    schedules = db.query(InspectionScheduleTemplate).filter(
        InspectionScheduleTemplate.facility_id == facility_id,
        InspectionScheduleTemplate.is_active == True,
        InspectionScheduleTemplate.next_due >= today,
        InspectionScheduleTemplate.next_due <= cutoff,
    ).order_by(InspectionScheduleTemplate.next_due.asc()).all()
    return schedules


@router.post("/{schedule_id}/complete", response_model=ScheduleResponse)
def complete_inspection(
    facility_id: str,
    schedule_id: str,
    req: CompleteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """点検完了を記録し、次回予定日を自動計算"""

    schedule = db.query(InspectionScheduleTemplate).filter(
        InspectionScheduleTemplate.id == schedule_id,
        InspectionScheduleTemplate.facility_id == facility_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="スケジュールが見つかりません")

    schedule.last_performed = req.performed_date
    schedule.next_due = _calculate_next_due(req.performed_date, schedule.frequency)

    if req.notes:
        schedule.notes = req.notes

    db.commit()
    db.refresh(schedule)
    return schedule
