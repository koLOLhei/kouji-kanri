"""品質管理・出来高管理ルーター (Quality control, Stage confirmations, Progress payments)."""

from datetime import datetime, timezone, date
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.quality import QualityControlItem, QualityMeasurement, StageConfirmation, ProgressPayment
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.errors import AppError
from services.quality_statistics import (
    calculate_xbar_r_chart,
    calculate_histogram,
    calculate_as_built_management,
)

router = APIRouter(tags=["quality"])


# ===========================================================================
# Schemas
# ===========================================================================

class QualityControlItemCreate(BaseModel):
    phase_id: Optional[str] = None
    item_name: str
    control_type: str  # "x_bar_r" | "histogram" | "range_check"
    design_value: Optional[float] = None
    upper_limit: Optional[float] = None
    lower_limit: Optional[float] = None
    unit: Optional[str] = None
    measurement_method: Optional[str] = None
    frequency: Optional[str] = None


class QualityControlItemUpdate(BaseModel):
    phase_id: Optional[str] = None
    item_name: Optional[str] = None
    control_type: Optional[str] = None
    design_value: Optional[float] = None
    upper_limit: Optional[float] = None
    lower_limit: Optional[float] = None
    unit: Optional[str] = None
    measurement_method: Optional[str] = None
    frequency: Optional[str] = None


class QualityMeasurementCreate(BaseModel):
    measured_value: float
    measured_at: Optional[datetime] = None
    measured_by: Optional[str] = None
    location: Optional[str] = None
    lot_number: Optional[str] = None
    sample_number: Optional[str] = None
    notes: Optional[str] = None


class QualityMeasurementUpdate(BaseModel):
    measured_value: Optional[float] = None
    measured_at: Optional[datetime] = None
    measured_by: Optional[str] = None
    location: Optional[str] = None
    lot_number: Optional[str] = None
    sample_number: Optional[str] = None
    notes: Optional[str] = None


class StageConfirmationCreate(BaseModel):
    phase_id: Optional[str] = None
    confirmation_type: str
    scheduled_date: Optional[date] = None
    actual_date: Optional[date] = None
    inspector_name: Optional[str] = None
    inspector_org: Optional[str] = None
    location: Optional[str] = None
    items_json: Optional[list[dict[str, Any]]] = None
    result: Optional[str] = None
    photos: Optional[list[str]] = None
    comments: Optional[str] = None
    confirmation_by: Optional[str] = None
    witness_by: Optional[str] = None


class StageConfirmationUpdate(BaseModel):
    phase_id: Optional[str] = None
    confirmation_type: Optional[str] = None
    scheduled_date: Optional[date] = None
    actual_date: Optional[date] = None
    inspector_name: Optional[str] = None
    inspector_org: Optional[str] = None
    location: Optional[str] = None
    items_json: Optional[list[dict[str, Any]]] = None
    result: Optional[str] = None
    photos: Optional[list[str]] = None
    comments: Optional[str] = None
    confirmation_by: Optional[str] = None
    witness_by: Optional[str] = None


class ProgressPaymentCreate(BaseModel):
    period_start: date
    period_end: date
    period_number: int = Field(..., ge=1)
    items_json: Optional[list[dict[str, Any]]] = None
    total_contract_amount: Optional[float] = Field(default=None, ge=0)
    total_cumulative_amount: Optional[float] = Field(default=None, ge=0)
    total_this_period: Optional[float] = Field(default=None, ge=0)
    progress_rate: Optional[float] = Field(default=None, ge=0, le=100)
    status: str = "draft"


class ProgressPaymentUpdate(BaseModel):
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    period_number: Optional[int] = Field(default=None, ge=1)
    items_json: Optional[list[dict[str, Any]]] = None
    total_contract_amount: Optional[float] = Field(default=None, ge=0)
    total_cumulative_amount: Optional[float] = Field(default=None, ge=0)
    total_this_period: Optional[float] = Field(default=None, ge=0)
    progress_rate: Optional[float] = Field(default=None, ge=0, le=100)
    status: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


# ===========================================================================
# Helper: auto-calculate is_passed for a measurement
# ===========================================================================

def _auto_is_passed(item: QualityControlItem, value: float) -> Optional[bool]:
    """Return True/False based on item limits, or None if limits not defined."""
    has_upper = item.upper_limit is not None
    has_lower = item.lower_limit is not None
    if not has_upper and not has_lower:
        return None
    if has_upper and value > item.upper_limit:
        return False
    if has_lower and value < item.lower_limit:
        return False
    return True


# ===========================================================================
# Quality Control Items
# ===========================================================================

@router.get("/api/projects/{project_id}/quality-items")
def list_quality_items(
    project_id: str,
    phase_id: Optional[str] = Query(None),
    control_type: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(QualityControlItem).filter(QualityControlItem.project_id == project_id)
    if phase_id:
        q = q.filter(QualityControlItem.phase_id == phase_id)
    if control_type:
        q = q.filter(QualityControlItem.control_type == control_type)
    return q.order_by(QualityControlItem.created_at.asc()).all()


@router.post("/api/projects/{project_id}/quality-items", status_code=201)
def create_quality_item(
    project_id: str,
    req: QualityControlItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    item = QualityControlItem(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/api/projects/{project_id}/quality-items/{item_id}")
def get_quality_item(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    item = db.query(QualityControlItem).filter(
        QualityControlItem.id == item_id,
        QualityControlItem.project_id == project_id,
    ).first()
    if not item:
        raise AppError(404, "品質管理項目が見つかりません", "QUALITY_ITEM_NOT_FOUND")
    return item


@router.put("/api/projects/{project_id}/quality-items/{item_id}")
def update_quality_item(
    project_id: str,
    item_id: str,
    req: QualityControlItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    item = db.query(QualityControlItem).filter(
        QualityControlItem.id == item_id,
        QualityControlItem.project_id == project_id,
    ).first()
    if not item:
        raise AppError(404, "品質管理項目が見つかりません", "QUALITY_ITEM_NOT_FOUND")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/api/projects/{project_id}/quality-items/{item_id}")
def delete_quality_item(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    item = db.query(QualityControlItem).filter(
        QualityControlItem.id == item_id,
        QualityControlItem.project_id == project_id,
    ).first()
    if not item:
        raise AppError(404, "品質管理項目が見つかりません", "QUALITY_ITEM_NOT_FOUND")
    # Cascade delete measurements
    db.query(QualityMeasurement).filter(QualityMeasurement.item_id == item_id).delete()
    db.delete(item)
    db.commit()
    return {"status": "ok"}


# ===========================================================================
# Quality Measurements
# ===========================================================================

def _get_item_or_404(db: Session, project_id: str, item_id: str) -> QualityControlItem:
    item = db.query(QualityControlItem).filter(
        QualityControlItem.id == item_id,
        QualityControlItem.project_id == project_id,
    ).first()
    if not item:
        raise AppError(404, "品質管理項目が見つかりません", "QUALITY_ITEM_NOT_FOUND")
    return item


@router.get("/api/projects/{project_id}/quality-items/{item_id}/measurements")
def list_measurements(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _get_item_or_404(db, project_id, item_id)
    return (
        db.query(QualityMeasurement)
        .filter(QualityMeasurement.item_id == item_id)
        .order_by(QualityMeasurement.measured_at.asc())
        .all()
    )


@router.post("/api/projects/{project_id}/quality-items/{item_id}/measurements", status_code=201)
def create_measurement(
    project_id: str,
    item_id: str,
    req: QualityMeasurementCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ctrl_item = _get_item_or_404(db, project_id, item_id)
    is_passed = _auto_is_passed(ctrl_item, req.measured_value)
    data = req.model_dump()
    if data.get("measured_at") is None:
        data["measured_at"] = datetime.now(timezone.utc)
    m = QualityMeasurement(
        item_id=item_id,
        tenant_id=user.tenant_id,
        is_passed=is_passed,
        **data,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.get("/api/projects/{project_id}/quality-items/{item_id}/measurements/{measurement_id}")
def get_measurement(
    project_id: str,
    item_id: str,
    measurement_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _get_item_or_404(db, project_id, item_id)
    m = db.query(QualityMeasurement).filter(
        QualityMeasurement.id == measurement_id,
        QualityMeasurement.item_id == item_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="測定値が見つかりません")
    return m


@router.put("/api/projects/{project_id}/quality-items/{item_id}/measurements/{measurement_id}")
def update_measurement(
    project_id: str,
    item_id: str,
    measurement_id: str,
    req: QualityMeasurementUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    ctrl_item = _get_item_or_404(db, project_id, item_id)
    m = db.query(QualityMeasurement).filter(
        QualityMeasurement.id == measurement_id,
        QualityMeasurement.item_id == item_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="測定値が見つかりません")
    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(m, k, v)
    # Recalculate is_passed if measured_value changed
    if "measured_value" in data:
        m.is_passed = _auto_is_passed(ctrl_item, m.measured_value)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/api/projects/{project_id}/quality-items/{item_id}/measurements/{measurement_id}")
def delete_measurement(
    project_id: str,
    item_id: str,
    measurement_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _get_item_or_404(db, project_id, item_id)
    m = db.query(QualityMeasurement).filter(
        QualityMeasurement.id == measurement_id,
        QualityMeasurement.item_id == item_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="測定値が見つかりません")
    db.delete(m)
    db.commit()
    return {"status": "ok"}


# ===========================================================================
# Statistical charts
# ===========================================================================

@router.get("/api/projects/{project_id}/quality-items/{item_id}/xbar-r-chart")
def get_xbar_r_chart(
    project_id: str,
    item_id: str,
    subgroup_size: int = Query(5, ge=2, le=6),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """x̄-R管理図データを返す"""
    ctrl_item = _get_item_or_404(db, project_id, item_id)
    rows = (
        db.query(QualityMeasurement)
        .filter(QualityMeasurement.item_id == item_id)
        .order_by(QualityMeasurement.measured_at.asc())
        .all()
    )
    values = [r.measured_value for r in rows]
    if len(values) < subgroup_size:
        raise HTTPException(
            status_code=400,
            detail=f"x̄-R管理図には最低{subgroup_size}件の測定値が必要です（現在: {len(values)}件）",
        )
    chart = calculate_xbar_r_chart(values, subgroup_size)
    return {
        "item": ctrl_item,
        "chart": chart,
        "upper_limit": ctrl_item.upper_limit,
        "lower_limit": ctrl_item.lower_limit,
        "design_value": ctrl_item.design_value,
        "unit": ctrl_item.unit,
    }


@router.get("/api/projects/{project_id}/quality-items/{item_id}/histogram")
def get_histogram(
    project_id: str,
    item_id: str,
    num_bins: int = Query(10, ge=3, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """ヒストグラム・度数分布表データを返す"""
    ctrl_item = _get_item_or_404(db, project_id, item_id)
    rows = (
        db.query(QualityMeasurement)
        .filter(QualityMeasurement.item_id == item_id)
        .order_by(QualityMeasurement.measured_at.asc())
        .all()
    )
    values = [r.measured_value for r in rows]
    if not values:
        raise HTTPException(status_code=400, detail="測定値がありません")
    hist = calculate_histogram(
        values,
        num_bins=num_bins,
        upper_limit=ctrl_item.upper_limit,
        lower_limit=ctrl_item.lower_limit,
    )
    return {
        "item": ctrl_item,
        "histogram": hist,
        "upper_limit": ctrl_item.upper_limit,
        "lower_limit": ctrl_item.lower_limit,
        "design_value": ctrl_item.design_value,
        "unit": ctrl_item.unit,
    }


@router.get("/api/projects/{project_id}/quality-items/{item_id}/as-built-chart")
def get_as_built_chart(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """出来形管理図データを返す"""
    ctrl_item = _get_item_or_404(db, project_id, item_id)
    if ctrl_item.upper_limit is None or ctrl_item.lower_limit is None or ctrl_item.design_value is None:
        raise HTTPException(
            status_code=400,
            detail="出来形管理図には設計値・規格上限値・規格下限値が必要です",
        )
    rows = (
        db.query(QualityMeasurement)
        .filter(QualityMeasurement.item_id == item_id)
        .order_by(QualityMeasurement.measured_at.asc())
        .all()
    )
    measurements_data = [
        {
            "location": r.location or "",
            "value": r.measured_value,
            "lot_number": r.lot_number,
            "sample_number": r.sample_number,
            "measured_at": r.measured_at.isoformat() if r.measured_at else None,
            "measured_by": r.measured_by,
        }
        for r in rows
    ]
    result = calculate_as_built_management(
        measurements_data,
        design_value=ctrl_item.design_value,
        upper_limit=ctrl_item.upper_limit,
        lower_limit=ctrl_item.lower_limit,
    )
    return {
        "item": ctrl_item,
        "as_built": result,
        "unit": ctrl_item.unit,
    }


# ===========================================================================
# Stage Confirmations (段階確認)
# ===========================================================================

@router.get("/api/projects/{project_id}/stage-confirmations")
def list_stage_confirmations(
    project_id: str,
    phase_id: Optional[str] = Query(None),
    confirmation_type: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(StageConfirmation).filter(StageConfirmation.project_id == project_id)
    if phase_id:
        q = q.filter(StageConfirmation.phase_id == phase_id)
    if confirmation_type:
        q = q.filter(StageConfirmation.confirmation_type == confirmation_type)
    if result:
        q = q.filter(StageConfirmation.result == result)
    return q.order_by(StageConfirmation.scheduled_date.asc()).all()


@router.post("/api/projects/{project_id}/stage-confirmations", status_code=201)
def create_stage_confirmation(
    project_id: str,
    req: StageConfirmationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    data = req.model_dump()
    # Convert photos list to JSON-storable format
    sc = StageConfirmation(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **data,
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)
    return sc


@router.get("/api/projects/{project_id}/stage-confirmations/{confirmation_id}")
def get_stage_confirmation(
    project_id: str,
    confirmation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    sc = db.query(StageConfirmation).filter(
        StageConfirmation.id == confirmation_id,
        StageConfirmation.project_id == project_id,
    ).first()
    if not sc:
        raise HTTPException(status_code=404, detail="段階確認記録が見つかりません")
    return sc


@router.put("/api/projects/{project_id}/stage-confirmations/{confirmation_id}")
def update_stage_confirmation(
    project_id: str,
    confirmation_id: str,
    req: StageConfirmationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    sc = db.query(StageConfirmation).filter(
        StageConfirmation.id == confirmation_id,
        StageConfirmation.project_id == project_id,
    ).first()
    if not sc:
        raise HTTPException(status_code=404, detail="段階確認記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(sc, k, v)
    db.commit()
    db.refresh(sc)
    return sc


@router.delete("/api/projects/{project_id}/stage-confirmations/{confirmation_id}")
def delete_stage_confirmation(
    project_id: str,
    confirmation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    sc = db.query(StageConfirmation).filter(
        StageConfirmation.id == confirmation_id,
        StageConfirmation.project_id == project_id,
    ).first()
    if not sc:
        raise HTTPException(status_code=404, detail="段階確認記録が見つかりません")
    db.delete(sc)
    db.commit()
    return {"status": "ok"}


# ===========================================================================
# Progress Payments (出来高管理)
# ===========================================================================

@router.get("/api/projects/{project_id}/progress-payments")
def list_progress_payments(
    project_id: str,
    status: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    q = db.query(ProgressPayment).filter(ProgressPayment.project_id == project_id)
    if status:
        q = q.filter(ProgressPayment.status == status)
    return q.order_by(ProgressPayment.period_number.asc()).all()


@router.post("/api/projects/{project_id}/progress-payments", status_code=201)
def create_progress_payment(
    project_id: str,
    req: ProgressPaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    pp = ProgressPayment(
        project_id=project_id,
        tenant_id=user.tenant_id,
        **req.model_dump(),
    )
    db.add(pp)
    db.commit()
    db.refresh(pp)
    return pp


@router.get("/api/projects/{project_id}/progress-payments/{payment_id}")
def get_progress_payment(
    project_id: str,
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    pp = db.query(ProgressPayment).filter(
        ProgressPayment.id == payment_id,
        ProgressPayment.project_id == project_id,
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail="出来高管理レコードが見つかりません")
    return pp


@router.put("/api/projects/{project_id}/progress-payments/{payment_id}")
def update_progress_payment(
    project_id: str,
    payment_id: str,
    req: ProgressPaymentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    pp = db.query(ProgressPayment).filter(
        ProgressPayment.id == payment_id,
        ProgressPayment.project_id == project_id,
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail="出来高管理レコードが見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(pp, k, v)
    db.commit()
    db.refresh(pp)
    return pp


@router.delete("/api/projects/{project_id}/progress-payments/{payment_id}")
def delete_progress_payment(
    project_id: str,
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    pp = db.query(ProgressPayment).filter(
        ProgressPayment.id == payment_id,
        ProgressPayment.project_id == project_id,
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail="出来高管理レコードが見つかりません")
    db.delete(pp)
    db.commit()
    return {"status": "ok"}


@router.get("/api/projects/{project_id}/progress-payments/{payment_id}/summary")
def get_progress_payment_summary(
    project_id: str,
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """出来高支払い請求の集計サマリーを返す"""
    pp = db.query(ProgressPayment).filter(
        ProgressPayment.id == payment_id,
        ProgressPayment.project_id == project_id,
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail="出来高管理レコードが見つかりません")

    items = pp.items_json or []
    item_count = len(items)

    def _safe_float(val, default=0.0) -> float:
        """不正な値やNoneを安全にfloatに変換。入力ミスでAPIが落ちない。"""
        if val is None:
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            return default

    # Aggregate from items_json if totals are not directly stored
    computed_contract = sum(_safe_float(i.get("contract_amount")) for i in items)
    computed_cumulative = sum(_safe_float(i.get("cumulative_amount")) for i in items)
    computed_this_period = sum(_safe_float(i.get("this_period_amount")) for i in items)

    total_contract = pp.total_contract_amount if pp.total_contract_amount is not None else computed_contract
    total_cumulative = pp.total_cumulative_amount if pp.total_cumulative_amount is not None else computed_cumulative
    total_this_period = pp.total_this_period if pp.total_this_period is not None else computed_this_period

    overall_progress_rate = pp.progress_rate
    if overall_progress_rate is None and total_contract > 0:
        overall_progress_rate = (total_cumulative / total_contract) * 100

    # Build per-item progress summary
    item_summaries = []
    for i in items:
        contract_amt = _safe_float(i.get("contract_amount"))
        cumul_amt = _safe_float(i.get("cumulative_amount"))
        this_amt = _safe_float(i.get("this_period_amount"))
        rate = _safe_float(i.get("progress_rate"))
        if rate == 0 and contract_amt > 0:
            rate = (cumul_amt / contract_amt) * 100
        item_summaries.append({
            "item_name": i.get("item_name", ""),
            "unit": i.get("unit", ""),
            "contract_qty": i.get("contract_qty"),
            "contract_amount": contract_amt,
            "cumulative_qty": i.get("cumulative_qty"),
            "cumulative_amount": cumul_amt,
            "this_period_qty": i.get("this_period_qty"),
            "this_period_amount": this_amt,
            "progress_rate": round(rate, 2),
        })

    return {
        "payment_id": pp.id,
        "project_id": pp.project_id,
        "period_number": pp.period_number,
        "period_start": pp.period_start,
        "period_end": pp.period_end,
        "status": pp.status,
        "approved_by": pp.approved_by,
        "approved_at": pp.approved_at,
        "total_contract_amount": total_contract,
        "total_cumulative_amount": total_cumulative,
        "total_this_period": total_this_period,
        "overall_progress_rate": round(overall_progress_rate, 2) if overall_progress_rate is not None else None,
        "remaining_amount": round(total_contract - total_cumulative, 2) if total_contract else None,
        "item_count": item_count,
        "items": item_summaries,
    }
