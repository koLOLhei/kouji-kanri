"""施設インフラDB + 保守契約管理 — 戦略的データ資産"""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.facility import Facility, FacilityZone, InfraElement, InfraInspectionLog, MaintenanceContract
from models.user import User
from services.auth_service import get_current_user, require_role
from services.timezone_utils import today_jst

router = APIRouter(tags=["facilities"])


# ─── Schemas ───

class FacilityCreate(BaseModel):
    name: str
    address: str | None = None
    building_type: str | None = None
    structure_type: str | None = None
    floors_above: int | None = None
    floors_below: int | None = None
    total_floor_area: float | None = None
    built_year: int | None = None
    owner_name: str | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    notes: str | None = None

class ZoneCreate(BaseModel):
    name: str
    zone_type: str
    parent_zone_id: str | None = None
    floor_number: int | None = None
    area_m2: float | None = None
    sort_order: int = 0
    notes: str | None = None

class InfraElementCreate(BaseModel):
    zone_id: str | None = None
    category: str  # electrical, plumbing, hvac, fire, gas, structural, communication, security
    element_type: str  # cable, conduit, panel, pipe, duct, etc.
    name: str
    position_description: str | None = None
    route_description: str | None = None
    specification: str | None = None
    manufacturer: str | None = None
    model_number: str | None = None
    installation_date: date | None = None
    expected_lifetime_years: int | None = None
    condition: str = "unknown"
    attributes: dict | None = None
    discovered_project_id: str | None = None
    discovered_by: str | None = None
    notes: str | None = None

class InspectionLogCreate(BaseModel):
    element_id: str
    log_type: str  # inspection, repair, replacement, discovery, upgrade
    log_date: date
    project_id: str | None = None
    description: str | None = None
    condition_before: str | None = None
    condition_after: str | None = None
    cost: int | None = None
    performed_by: str | None = None
    notes: str | None = None

class MaintenanceContractCreate(BaseModel):
    facility_id: str
    client_name: str
    client_contact: str | None = None
    contract_type: str  # full, partial, data_only
    contract_start: date
    contract_end: date | None = None
    annual_fee: int | None = None
    data_access_scope: str = "basic"
    accessible_categories: list | None = None
    includes_drawings: bool = False
    includes_photos: bool = False
    includes_inspection_history: bool = True
    auto_renew: bool = True
    notes: str | None = None


# ─── 施設CRUD ───

@router.get("/api/facilities")
def list_facilities(
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    facilities = db.query(Facility).filter(Facility.tenant_id == user.tenant_id).order_by(Facility.name).all()
    # Batch counts (N+1回避)
    fac_ids = [f.id for f in facilities]
    elem_counts = dict(db.query(InfraElement.facility_id, func.count(InfraElement.id)).filter(
        InfraElement.facility_id.in_(fac_ids)).group_by(InfraElement.facility_id).all()) if fac_ids else {}
    zone_counts = dict(db.query(FacilityZone.facility_id, func.count(FacilityZone.id)).filter(
        FacilityZone.facility_id.in_(fac_ids)).group_by(FacilityZone.facility_id).all()) if fac_ids else {}

    result = []
    for f in facilities:
        d = {c.name: getattr(f, c.name) for c in f.__table__.columns}
        d["element_count"] = elem_counts.get(f.id, 0)
        d["zone_count"] = zone_counts.get(f.id, 0)
        d["has_contract"] = f.maintenance_contract
        result.append(d)
    return result

@router.post("/api/facilities")
def create_facility(req: FacilityCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = Facility(tenant_id=user.tenant_id, **req.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return f

@router.get("/api/facilities/{facility_id}")
def get_facility(facility_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = db.query(Facility).filter(Facility.id == facility_id, Facility.tenant_id == user.tenant_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="施設が見つかりません")
    d = {c.name: getattr(f, c.name) for c in f.__table__.columns}
    d["element_count"] = db.query(func.count(InfraElement.id)).filter(InfraElement.facility_id == f.id).scalar()
    d["zone_count"] = db.query(func.count(FacilityZone.id)).filter(FacilityZone.facility_id == f.id).scalar()
    # カテゴリ別要素数
    d["elements_by_category"] = {}
    cats = db.query(InfraElement.category, func.count(InfraElement.id)).filter(
        InfraElement.facility_id == f.id
    ).group_by(InfraElement.category).all()
    for cat, cnt in cats:
        d["elements_by_category"][cat] = cnt
    return d

@router.put("/api/facilities/{facility_id}")
def update_facility(facility_id: str, req: FacilityCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = db.query(Facility).filter(Facility.id == facility_id, Facility.tenant_id == user.tenant_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="施設が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(f, k, v)
    db.commit()
    db.refresh(f)
    return f


# ─── ゾーン ───

@router.get("/api/facilities/{facility_id}/zones")
def list_zones(facility_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(FacilityZone).filter(FacilityZone.facility_id == facility_id).order_by(FacilityZone.sort_order).all()

@router.post("/api/facilities/{facility_id}/zones")
def create_zone(facility_id: str, req: ZoneCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    z = FacilityZone(facility_id=facility_id, **req.model_dump())
    db.add(z)
    db.commit()
    db.refresh(z)
    return z


# ─── インフラ要素 ───

@router.get("/api/facilities/{facility_id}/elements")
def list_elements(
    facility_id: str,
    category: str | None = None,
    zone_id: str | None = None,
    condition: str | None = None,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    q = db.query(InfraElement).filter(InfraElement.facility_id == facility_id, InfraElement.is_active == True)
    if category:
        q = q.filter(InfraElement.category == category)
    if zone_id:
        q = q.filter(InfraElement.zone_id == zone_id)
    if condition:
        q = q.filter(InfraElement.condition == condition)
    return q.order_by(InfraElement.category, InfraElement.name).all()

@router.post("/api/facilities/{facility_id}/elements")
def create_element(facility_id: str, req: InfraElementCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    el = InfraElement(
        facility_id=facility_id,
        discovered_date=today_jst() if not req.installation_date else None,
        **req.model_dump(),
    )
    db.add(el)
    db.commit()
    db.refresh(el)
    return el

@router.get("/api/facilities/{facility_id}/elements/{element_id}")
def get_element(facility_id: str, element_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    el = db.query(InfraElement).filter(InfraElement.id == element_id, InfraElement.facility_id == facility_id).first()
    if not el:
        raise HTTPException(status_code=404, detail="インフラ要素が見つかりません")
    d = {c.name: getattr(el, c.name) for c in el.__table__.columns}
    # 点検履歴
    logs = db.query(InfraInspectionLog).filter(InfraInspectionLog.element_id == element_id).order_by(InfraInspectionLog.log_date.desc()).all()
    d["inspection_logs"] = [{c.name: getattr(l, c.name) for c in l.__table__.columns} for l in logs]
    return d

@router.put("/api/facilities/{facility_id}/elements/{element_id}")
def update_element(facility_id: str, element_id: str, req: InfraElementCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    el = db.query(InfraElement).filter(InfraElement.id == element_id, InfraElement.facility_id == facility_id).first()
    if not el:
        raise HTTPException(status_code=404, detail="インフラ要素が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(el, k, v)
    db.commit()
    db.refresh(el)
    return el


# ─── 点検・工事履歴 ───

@router.get("/api/facilities/{facility_id}/logs")
def list_logs(facility_id: str, element_id: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(InfraInspectionLog).filter(InfraInspectionLog.facility_id == facility_id)
    if element_id:
        q = q.filter(InfraInspectionLog.element_id == element_id)
    return q.order_by(InfraInspectionLog.log_date.desc()).all()

@router.post("/api/facilities/{facility_id}/logs")
def create_log(facility_id: str, req: InspectionLogCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log = InfraInspectionLog(facility_id=facility_id, **req.model_dump())
    db.add(log)
    # Update element condition
    if req.condition_after:
        el = db.query(InfraElement).filter(InfraElement.id == req.element_id).first()
        if el:
            el.condition = req.condition_after
            el.last_inspected = req.log_date
    db.commit()
    db.refresh(log)
    return log


# ─── 保守契約 ───

@router.get("/api/maintenance-contracts")
def list_contracts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contracts = db.query(MaintenanceContract).filter(MaintenanceContract.tenant_id == user.tenant_id).order_by(MaintenanceContract.contract_start.desc()).all()
    result = []
    for c in contracts:
        d = {col.name: getattr(c, col.name) for col in c.__table__.columns}
        f = db.query(Facility).filter(Facility.id == c.facility_id).first()
        d["facility_name"] = f.name if f else None
        result.append(d)
    return result

@router.post("/api/maintenance-contracts")
def create_contract(req: MaintenanceContractCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mc = MaintenanceContract(tenant_id=user.tenant_id, **req.model_dump())
    db.add(mc)
    # Update facility flag
    f = db.query(Facility).filter(Facility.id == req.facility_id).first()
    if f:
        f.maintenance_contract = True
        f.contract_start = req.contract_start
        f.contract_end = req.contract_end
        f.contract_amount_yearly = req.annual_fee
        f.data_access_level = "contract_only"
    db.commit()
    db.refresh(mc)
    return mc


# ─── 施設データ統計（全社） ───

@router.get("/api/facility-stats")
def facility_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_facilities = db.query(func.count(Facility.id)).filter(Facility.tenant_id == user.tenant_id).scalar()
    with_contract = db.query(func.count(Facility.id)).filter(Facility.tenant_id == user.tenant_id, Facility.maintenance_contract == True).scalar()
    total_elements = db.query(func.count(InfraElement.id)).join(Facility, InfraElement.facility_id == Facility.id).filter(Facility.tenant_id == user.tenant_id).scalar()
    total_logs = db.query(func.count(InfraInspectionLog.id)).join(Facility, InfraInspectionLog.facility_id == Facility.id).filter(Facility.tenant_id == user.tenant_id).scalar()
    annual_revenue = db.query(func.sum(MaintenanceContract.annual_fee)).filter(
        MaintenanceContract.tenant_id == user.tenant_id, MaintenanceContract.status == "active"
    ).scalar() or 0

    return {
        "total_facilities": total_facilities,
        "with_maintenance_contract": with_contract,
        "contract_rate": round(with_contract / total_facilities * 100, 1) if total_facilities > 0 else 0,
        "total_infra_elements": total_elements,
        "total_inspection_logs": total_logs,
        "annual_maintenance_revenue": annual_revenue,
        "data_value_score": total_elements * 10 + total_logs * 5,  # データ価値スコア
    }


# ─── 保守契約先向けデータ提供API ───

@router.get("/api/facilities/{facility_id}/shared-data")
def get_shared_data(
    facility_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """保守契約先に提供するデータ。契約内容に応じてフィルタリング。"""
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="施設が見つかりません")

    # 契約を確認
    contract = db.query(MaintenanceContract).filter(
        MaintenanceContract.facility_id == facility_id,
        MaintenanceContract.status == "active",
    ).first()

    if not contract and facility.data_access_level == "private":
        raise HTTPException(status_code=403, detail="このデータへのアクセス権がありません")

    # ゾーン
    zones = db.query(FacilityZone).filter(FacilityZone.facility_id == facility_id).all()

    # インフラ要素（契約範囲でフィルタ）
    q = db.query(InfraElement).filter(InfraElement.facility_id == facility_id, InfraElement.is_active == True)
    if contract and contract.accessible_categories:
        q = q.filter(InfraElement.category.in_(contract.accessible_categories))
    elements = q.all()

    # 点検履歴（契約に含まれる場合）
    logs = []
    if not contract or contract.includes_inspection_history:
        logs = db.query(InfraInspectionLog).filter(InfraInspectionLog.facility_id == facility_id).order_by(InfraInspectionLog.log_date.desc()).limit(100).all()

    return {
        "facility": {c.name: getattr(facility, c.name) for c in facility.__table__.columns},
        "zones": [{c.name: getattr(z, c.name) for c in z.__table__.columns} for z in zones],
        "elements": [{c.name: getattr(e, c.name) for c in e.__table__.columns} for e in elements],
        "inspection_logs": [{c.name: getattr(l, c.name) for c in l.__table__.columns} for l in logs],
        "data_scope": contract.data_access_scope if contract else "public",
    }
