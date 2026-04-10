"""テナント全データエクスポートAPI — 管理者向け一括JSON出力"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.phase import Phase
from models.photo import Photo
from models.report import Report
from models.worker import Worker
from models.subcontractor import Subcontractor
from models.facility import Facility
from models.crm import Customer
from models.user import User
from services.auth_service import require_role

router = APIRouter(prefix="/api/admin/data-export", tags=["data-export"])


@router.get("")
def export_tenant_data(
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """テナントの全データをJSON形式でエクスポート"""
    tid = user.tenant_id

    # Projects with counts
    projects_raw = db.query(Project).filter(Project.tenant_id == tid).all()
    projects = []
    for p in projects_raw:
        phase_count = db.query(Phase).filter(Phase.project_id == p.id).count()
        photo_count = db.query(Photo).filter(Photo.project_id == p.id).count()
        report_count = db.query(Report).filter(Report.project_id == p.id).count()
        projects.append({
            "id": p.id,
            "name": p.name,
            "project_code": p.project_code,
            "client_name": p.client_name,
            "contractor_name": p.contractor_name,
            "site_address": p.site_address,
            "contract_amount": p.contract_amount,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "status": p.status,
            "phases_count": phase_count,
            "photos_count": photo_count,
            "reports_count": report_count,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    # Workers
    workers_raw = db.query(Worker).filter(Worker.tenant_id == tid).all()
    workers = [
        {
            "id": w.id,
            "name": w.name,
            "name_kana": w.name_kana,
            "is_active": w.is_active,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }
        for w in workers_raw
    ]

    # Customers (CRM)
    customers_raw = db.query(Customer).filter(Customer.tenant_id == tid).all()
    customers = [
        {
            "id": c.id,
            "company_name": c.company_name,
            "company_type": c.company_type,
            "status": c.status,
            "rank": c.rank,
            "total_contract_amount": c.total_contract_amount,
            "project_count": c.project_count,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in customers_raw
    ]

    # Subcontractors
    subs_raw = db.query(Subcontractor).filter(Subcontractor.tenant_id == tid).all()
    subcontractors = [
        {
            "id": s.id,
            "company_name": s.company_name,
            "representative": s.representative,
            "phone": s.phone,
            "email": s.email,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in subs_raw
    ]

    # Facilities
    facs_raw = db.query(Facility).filter(Facility.tenant_id == tid).all()
    facilities = [
        {
            "id": f.id,
            "name": f.name,
            "address": f.address,
            "building_type": f.building_type,
            "structure_type": f.structure_type,
        }
        for f in facs_raw
    ]

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "tenant": {
            "id": tid,
        },
        "projects": projects,
        "workers": workers,
        "customers": customers,
        "subcontractors": subcontractors,
        "facilities": facilities,
    }
