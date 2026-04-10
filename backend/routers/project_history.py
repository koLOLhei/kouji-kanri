"""案件に紐づく全履歴の集約API — 枝の先っぽまで辿れる"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.subcontractor import SubcontractorContract, Subcontractor
from models.material import MaterialOrder, MaterialOrderItem
from models.crm import Customer, CustomerContact, Lead, Interaction, EntityLink, Brand
from models.facility import Facility
from models.daily_report import DailyReport
from models.inspection import Inspection
from models.meeting import Meeting
from models.photo import Photo
from models.corrective_action import CorrectiveAction
from models.design_change import DesignChange
from models.milestone import Milestone
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}/history", tags=["project-history"])


# ─── Helpers ───

def _get_project_or_404(db: Session, project_id: str, tenant_id: str) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.tenant_id == tenant_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")
    return project


def _get_linked_entity(db: Session, tenant_id: str, project_id: str, target_type: str):
    """Get entity linked to this project via EntityLink."""
    links = (
        db.query(EntityLink)
        .filter(
            EntityLink.tenant_id == tenant_id,
            (
                (EntityLink.from_type == "project") & (EntityLink.from_id == project_id) & (EntityLink.to_type == target_type)
            ) | (
                (EntityLink.to_type == "project") & (EntityLink.to_id == project_id) & (EntityLink.from_type == target_type)
            ),
        )
        .all()
    )
    ids = set()
    for lnk in links:
        if lnk.from_type == target_type:
            ids.add(lnk.from_id)
        else:
            ids.add(lnk.to_id)
    return list(ids)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  /full — Project complete history
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/full")
def project_full_history(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    tid = user.tenant_id
    project = _get_project_or_404(db, project_id, tid)

    # Customer (via EntityLink)
    customer_ids = _get_linked_entity(db, tid, project_id, "customer")
    customers = db.query(Customer).filter(Customer.id.in_(customer_ids)).all() if customer_ids else []

    # Customer contacts (via EntityLink)
    contact_ids = _get_linked_entity(db, tid, project_id, "contact")
    contacts = db.query(CustomerContact).filter(CustomerContact.id.in_(contact_ids)).all() if contact_ids else []
    # Also get contacts from linked customers
    if customer_ids:
        customer_contacts = (
            db.query(CustomerContact)
            .filter(CustomerContact.customer_id.in_(customer_ids))
            .all()
        )
        existing_ids = {c.id for c in contacts}
        for cc in customer_contacts:
            if cc.id not in existing_ids:
                contacts.append(cc)

    # Interactions related to this project
    interactions = (
        db.query(Interaction)
        .filter(Interaction.tenant_id == tid, Interaction.project_id == project_id)
        .order_by(Interaction.interaction_date.desc())
        .all()
    )

    # Subcontractors (via SubcontractorContract)
    contracts = (
        db.query(SubcontractorContract)
        .filter(SubcontractorContract.project_id == project_id)
        .all()
    )
    sub_ids = list({c.subcontractor_id for c in contracts})
    subcontractors = db.query(Subcontractor).filter(Subcontractor.id.in_(sub_ids)).all() if sub_ids else []

    # Materials (via MaterialOrder -> MaterialOrderItem)
    orders = (
        db.query(MaterialOrder)
        .filter(MaterialOrder.project_id == project_id)
        .all()
    )
    order_ids = [o.id for o in orders]
    order_items = (
        db.query(MaterialOrderItem)
        .filter(MaterialOrderItem.order_id.in_(order_ids))
        .all()
    ) if order_ids else []

    # Facility (via EntityLink)
    facility_ids = _get_linked_entity(db, tid, project_id, "facility")
    facilities = db.query(Facility).filter(Facility.id.in_(facility_ids)).all() if facility_ids else []

    # Brand (via EntityLink)
    brand_ids = _get_linked_entity(db, tid, project_id, "brand")
    brands = db.query(Brand).filter(Brand.id.in_(brand_ids)).all() if brand_ids else []

    # Lead that originated this project (via EntityLink or converted_project_id)
    lead_ids = _get_linked_entity(db, tid, project_id, "lead")
    # Also check Lead.converted_project_id
    converted_leads = (
        db.query(Lead)
        .filter(Lead.tenant_id == tid, Lead.converted_project_id == project_id)
        .all()
    )
    all_lead_ids = set(lead_ids) | {l.id for l in converted_leads}
    leads = db.query(Lead).filter(Lead.id.in_(all_lead_ids)).all() if all_lead_ids else list(converted_leads)

    return {
        "project": project,
        "customers": customers,
        "contacts": contacts,
        "interactions": interactions,
        "subcontractor_contracts": contracts,
        "subcontractors": subcontractors,
        "material_orders": orders,
        "material_order_items": order_items,
        "facilities": facilities,
        "brands": brands,
        "leads": leads,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  /timeline — Chronological timeline
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/timeline")
def project_timeline(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    _get_project_or_404(db, project_id, user.tenant_id)

    events: list[dict] = []

    # Daily reports
    daily_reports = (
        db.query(DailyReport)
        .filter(DailyReport.project_id == project_id)
        .all()
    )
    for dr in daily_reports:
        events.append({
            "date": dr.report_date.isoformat(),
            "type": "daily_report",
            "title": f"日報 ({dr.report_date.isoformat()})",
            "detail": dr.work_description or "",
        })

    # Inspections
    inspections = (
        db.query(Inspection)
        .filter(Inspection.project_id == project_id)
        .all()
    )
    for insp in inspections:
        event_date = insp.actual_date or insp.scheduled_date
        if event_date:
            events.append({
                "date": event_date.isoformat(),
                "type": "inspection",
                "title": insp.title,
                "detail": f"種別: {insp.inspection_type}, 結果: {insp.result}",
            })

    # Meetings
    meetings = (
        db.query(Meeting)
        .filter(Meeting.project_id == project_id)
        .all()
    )
    for mtg in meetings:
        events.append({
            "date": mtg.meeting_date.isoformat(),
            "type": "meeting",
            "title": mtg.title,
            "detail": f"種別: {mtg.meeting_type}",
        })

    # Photos (count by day)
    photo_counts = (
        db.query(
            func.date(Photo.taken_at).label("photo_date"),
            func.count(Photo.id).label("cnt"),
        )
        .filter(Photo.project_id == project_id, Photo.taken_at != None)  # noqa: E711
        .group_by(func.date(Photo.taken_at))
        .all()
    )
    for row in photo_counts:
        if row.photo_date:
            d = row.photo_date if isinstance(row.photo_date, str) else row.photo_date.isoformat() if hasattr(row.photo_date, "isoformat") else str(row.photo_date)
            events.append({
                "date": d,
                "type": "photos",
                "title": f"写真 {row.cnt}枚",
                "detail": "",
            })

    # NCRs (Corrective Actions)
    ncrs = (
        db.query(CorrectiveAction)
        .filter(CorrectiveAction.project_id == project_id)
        .all()
    )
    for ncr in ncrs:
        event_date = ncr.detected_date
        if event_date:
            events.append({
                "date": event_date.isoformat(),
                "type": "ncr",
                "title": ncr.title,
                "detail": f"重要度: {ncr.severity}, 状態: {ncr.status}",
            })

    # Design changes
    changes = (
        db.query(DesignChange)
        .filter(DesignChange.project_id == project_id)
        .all()
    )
    for dc in changes:
        events.append({
            "date": dc.created_at.date().isoformat() if dc.created_at else "",
            "type": "design_change",
            "title": f"設計変更 第{dc.change_number}号: {dc.title}",
            "detail": f"種別: {dc.change_type}, 状態: {dc.status}",
        })

    # Milestones
    milestones = (
        db.query(Milestone)
        .filter(Milestone.project_id == project_id)
        .all()
    )
    for ms in milestones:
        event_date = ms.completed_date or ms.due_date
        events.append({
            "date": event_date.isoformat(),
            "type": "milestone",
            "title": ms.title,
            "detail": f"種別: {ms.milestone_type}, 状態: {ms.status}",
        })

    # Sort by date descending
    events.sort(key=lambda e: e["date"], reverse=True)

    return events
