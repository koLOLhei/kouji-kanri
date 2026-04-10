"""Subcontractor (協力業者) and contract router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.subcontractor import Subcontractor, SubcontractorContract
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api", tags=["subcontractors"])


# ---------- Schemas ----------

class SubcontractorCreate(BaseModel):
    company_name: str
    company_name_kana: str | None = None
    representative: str | None = None
    address: str | None = None
    phone: str | None = None
    fax: str | None = None
    email: str | None = None
    registration_number: str | None = None
    registration_category: str | None = None
    insurance_info: dict | None = None
    capital: int | None = None
    employee_count: int | None = None


class SubcontractorUpdate(BaseModel):
    company_name: str | None = None
    company_name_kana: str | None = None
    representative: str | None = None
    address: str | None = None
    phone: str | None = None
    fax: str | None = None
    email: str | None = None
    registration_number: str | None = None
    registration_category: str | None = None
    insurance_info: dict | None = None
    capital: int | None = None
    employee_count: int | None = None
    is_active: bool | None = None


class ContractCreate(BaseModel):
    subcontractor_id: str
    contract_type: str = "primary"
    parent_contract_id: str | None = None
    work_scope: str | None = None
    contract_amount: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    site_manager_name: str | None = None
    safety_manager_name: str | None = None


class ContractUpdate(BaseModel):
    work_scope: str | None = None
    contract_amount: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    site_manager_name: str | None = None
    safety_manager_name: str | None = None
    status: str | None = None


# ---------- Subcontractors (tenant-scoped) ----------

@router.get("/subcontractors")
def list_subcontractors(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Subcontractor).filter(
        Subcontractor.tenant_id == user.tenant_id, Subcontractor.is_active == True
    ).order_by(Subcontractor.company_name).all()


@router.post("/subcontractors")
def create_subcontractor(
    req: SubcontractorCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = Subcontractor(tenant_id=user.tenant_id, **req.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/subcontractors/{sub_id}")
def get_subcontractor(
    sub_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subcontractor).filter(
        Subcontractor.id == sub_id, Subcontractor.tenant_id == user.tenant_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="協力業者が見つかりません")
    return sub


@router.put("/subcontractors/{sub_id}")
def update_subcontractor(
    sub_id: str,
    req: SubcontractorUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subcontractor).filter(
        Subcontractor.id == sub_id, Subcontractor.tenant_id == user.tenant_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="協力業者が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(sub, k, v)
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/subcontractors/{sub_id}")
def delete_subcontractor(
    sub_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subcontractor).filter(
        Subcontractor.id == sub_id, Subcontractor.tenant_id == user.tenant_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="協力業者が見つかりません")
    sub.is_active = False
    db.commit()
    return {"status": "ok"}


# ---------- Contracts (project-scoped) ----------

@router.get("/projects/{project_id}/contracts")
def list_contracts(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return db.query(SubcontractorContract).filter(
        SubcontractorContract.project_id == project_id
    ).order_by(SubcontractorContract.created_at.desc()).all()


@router.post("/projects/{project_id}/contracts")
def create_contract(
    project_id: str,
    req: ContractCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    contract = SubcontractorContract(project_id=project_id, **req.model_dump())
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


@router.get("/projects/{project_id}/contracts/{contract_id}")
def get_contract(
    project_id: str, contract_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    c = db.query(SubcontractorContract).filter(
        SubcontractorContract.id == contract_id, SubcontractorContract.project_id == project_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="契約が見つかりません")
    return c


@router.put("/projects/{project_id}/contracts/{contract_id}")
def update_contract(
    project_id: str, contract_id: str, req: ContractUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    c = db.query(SubcontractorContract).filter(
        SubcontractorContract.id == contract_id, SubcontractorContract.project_id == project_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="契約が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/projects/{project_id}/contracts/{contract_id}")
def delete_contract(
    project_id: str, contract_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    c = db.query(SubcontractorContract).filter(
        SubcontractorContract.id == contract_id, SubcontractorContract.project_id == project_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="契約が見つかりません")
    db.delete(c)
    db.commit()
    return {"status": "ok"}


@router.get("/projects/{project_id}/construction-system")
def construction_system(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """施工体制台帳 tree structure."""
    contracts = db.query(SubcontractorContract).filter(
        SubcontractorContract.project_id == project_id
    ).all()

    sub_ids = {c.subcontractor_id for c in contracts}
    subs = {s.id: s for s in db.query(Subcontractor).filter(Subcontractor.id.in_(sub_ids)).all()} if sub_ids else {}

    def build_node(contract):
        sub = subs.get(contract.subcontractor_id)
        children = [build_node(c) for c in contracts if c.parent_contract_id == contract.id]
        return {
            "contract_id": contract.id,
            "subcontractor_id": contract.subcontractor_id,
            "company_name": sub.company_name if sub else None,
            "contract_type": contract.contract_type,
            "work_scope": contract.work_scope,
            "site_manager_name": contract.site_manager_name,
            "safety_manager_name": contract.safety_manager_name,
            "children": children,
        }

    roots = [build_node(c) for c in contracts if c.parent_contract_id is None]
    return roots
