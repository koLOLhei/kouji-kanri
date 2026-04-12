"""CRM: 顧客管理 + リード管理 + やりとり履歴 router."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from services.timezone_utils import today_jst

from database import get_db
from models.crm import Brand, Customer, CustomerContact, Lead, Interaction, EntityLink
from models.project import Project
from models.facility import Facility
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/crm", tags=["crm"])


# ─── Schemas ───

# Brands
class BrandCreate(BaseModel):
    name: str
    trade_type: str | None = None
    license_number: str | None = None
    representative: str | None = None
    address: str | None = None
    phone: str | None = None
    acquired_date: date | None = None
    notes: str | None = None


# Customers
class CustomerCreate(BaseModel):
    company_name: str
    company_type: str | None = None
    industry: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    rank: str | None = None
    assigned_brand_id: str | None = None
    notes: str | None = None


class CustomerUpdate(BaseModel):
    company_name: str | None = None
    company_type: str | None = None
    industry: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    status: str | None = None
    rank: str | None = None
    assigned_brand_id: str | None = None
    assigned_sales_id: str | None = None
    notes: str | None = None


# Contacts
class ContactCreate(BaseModel):
    name: str
    department: str | None = None
    position: str | None = None
    phone: str | None = None
    mobile: str | None = None
    email: str | None = None
    is_primary: bool = False
    is_decision_maker: bool = False


# Leads
class LeadCreate(BaseModel):
    source: str
    source_detail: str | None = None
    acquired_by_name: str | None = None
    acquired_date: date
    company_name: str
    contact_name: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    description: str | None = None
    estimated_amount: int | None = None
    priority: str = "B"
    brand_id: str | None = None


class LeadUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    source: str | None = None
    source_detail: str | None = None
    company_name: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    description: str | None = None
    estimated_amount: int | None = None
    lost_reason: str | None = None
    brand_id: str | None = None
    notes: str | None = None


class LeadConvertBody(BaseModel):
    create_project: bool = False
    project_name: str | None = None


# Interactions
class InteractionCreate(BaseModel):
    customer_id: str | None = None
    contact_id: str | None = None
    lead_id: str | None = None
    project_id: str | None = None
    interaction_date: date
    interaction_type: str
    subject: str
    content: str | None = None
    outcome: str | None = None
    next_action: str | None = None
    next_action_date: date | None = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Brands
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/brands")
def list_brands(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    brands = (
        db.query(Brand)
        .filter(Brand.tenant_id == user.tenant_id)
        .order_by(Brand.created_at.desc())
        .all()
    )
    return brands


@router.post("/brands")
def create_brand(
    req: BrandCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    brand = Brand(tenant_id=user.tenant_id, **req.model_dump())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Customers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/customers")
def list_customers(
    status: str | None = None,
    rank: str | None = None,
    company_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Customer).filter(Customer.tenant_id == user.tenant_id)
    if status:
        q = q.filter(Customer.status == status)
    if rank:
        q = q.filter(Customer.rank == rank)
    if company_type:
        q = q.filter(Customer.company_type == company_type)
    return q.order_by(Customer.created_at.desc()).all()


@router.post("/customers")
def create_customer(
    req: CustomerCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = Customer(tenant_id=user.tenant_id, **req.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/customers/{customer_id}")
def get_customer(
    customer_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.tenant_id == user.tenant_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="顧客が見つかりません")

    # Contacts
    contacts = (
        db.query(CustomerContact)
        .filter(CustomerContact.customer_id == customer_id)
        .all()
    )

    # Recent interactions (last 10)
    recent_interactions = (
        db.query(Interaction)
        .filter(Interaction.customer_id == customer_id, Interaction.tenant_id == user.tenant_id)
        .order_by(Interaction.interaction_date.desc())
        .limit(10)
        .all()
    )

    # Linked projects via EntityLink
    project_links = (
        db.query(EntityLink)
        .filter(
            EntityLink.tenant_id == user.tenant_id,
            EntityLink.from_type == "customer",
            EntityLink.from_id == customer_id,
            EntityLink.to_type == "project",
        )
        .all()
    )
    project_ids = [lnk.to_id for lnk in project_links]
    linked_projects = (
        db.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
    )

    # Linked facilities via EntityLink
    facility_links = (
        db.query(EntityLink)
        .filter(
            EntityLink.tenant_id == user.tenant_id,
            EntityLink.from_type == "customer",
            EntityLink.from_id == customer_id,
            EntityLink.to_type == "facility",
        )
        .all()
    )
    facility_ids = [lnk.to_id for lnk in facility_links]
    linked_facilities = (
        db.query(Facility).filter(Facility.id.in_(facility_ids)).all() if facility_ids else []
    )

    return {
        "customer": customer,
        "contacts": contacts,
        "recent_interactions": recent_interactions,
        "linked_projects": linked_projects,
        "linked_facilities": linked_facilities,
    }


@router.put("/customers/{customer_id}")
def update_customer(
    customer_id: str,
    req: CustomerUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.tenant_id == user.tenant_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="顧客が見つかりません")

    for key, val in req.model_dump(exclude_unset=True).items():
        setattr(customer, key, val)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/customers/{customer_id}/contacts")
def list_contacts(
    customer_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify customer belongs to tenant
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.tenant_id == user.tenant_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="顧客が見つかりません")

    return (
        db.query(CustomerContact)
        .filter(CustomerContact.customer_id == customer_id)
        .order_by(CustomerContact.created_at.desc())
        .all()
    )


@router.post("/customers/{customer_id}/contacts")
def create_contact(
    customer_id: str,
    req: ContactCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.tenant_id == user.tenant_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="顧客が見つかりません")

    contact = CustomerContact(customer_id=customer_id, **req.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Leads
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/leads")
def list_leads(
    status: str | None = None,
    priority: str | None = None,
    source: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Lead).filter(Lead.tenant_id == user.tenant_id)
    if status:
        q = q.filter(Lead.status == status)
    if priority:
        q = q.filter(Lead.priority == priority)
    if source:
        q = q.filter(Lead.source == source)
    return q.order_by(Lead.created_at.desc()).all()


@router.post("/leads")
def create_lead(
    req: LeadCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = Lead(
        tenant_id=user.tenant_id,
        acquired_by=user.id,
        **req.model_dump(),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/leads/{lead_id}")
def update_lead(
    lead_id: str,
    req: LeadUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.tenant_id == user.tenant_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="リードが見つかりません")

    for key, val in req.model_dump(exclude_unset=True).items():
        setattr(lead, key, val)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/convert")
def convert_lead(
    lead_id: str,
    req: LeadConvertBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.tenant_id == user.tenant_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="リードが見つかりません")
    if lead.converted_customer_id:
        raise HTTPException(status_code=400, detail="このリードは既にコンバート済みです")

    # 1. Create Customer
    customer = Customer(
        tenant_id=user.tenant_id,
        company_name=lead.company_name,
        status="active",
        first_contact_date=lead.acquired_date,
    )
    db.add(customer)
    db.flush()

    # 2. Create CustomerContact from lead contact data
    contact = None
    if lead.contact_name:
        contact = CustomerContact(
            customer_id=customer.id,
            name=lead.contact_name,
            phone=lead.contact_phone,
            email=lead.contact_email,
            is_primary=True,
        )
        db.add(contact)
        db.flush()

    # 3. Optionally create Project
    project = None
    if req.create_project:
        project_name = req.project_name or f"{lead.company_name} 案件"
        project = Project(
            tenant_id=user.tenant_id,
            name=project_name,
            client_name=lead.company_name,
            contract_amount=lead.estimated_amount,
            status="planning",
        )
        db.add(project)
        db.flush()

    # 4. Create EntityLinks
    # lead -> customer
    db.add(EntityLink(
        tenant_id=user.tenant_id,
        from_type="lead",
        from_id=lead.id,
        to_type="customer",
        to_id=customer.id,
        relationship="converted",
    ))

    if project:
        # customer -> project
        db.add(EntityLink(
            tenant_id=user.tenant_id,
            from_type="customer",
            from_id=customer.id,
            to_type="project",
            to_id=project.id,
            relationship="ordered",
        ))

    # 5. Update lead
    lead.status = "won"
    lead.converted_customer_id = customer.id
    lead.converted_project_id = project.id if project else None
    lead.converted_date = today_jst()

    db.commit()
    db.refresh(customer)

    result = {
        "customer_id": customer.id,
        "contact_id": contact.id if contact else None,
    }
    if project:
        result["project_id"] = project.id
    return result


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Interactions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/interactions")
def list_interactions(
    customer_id: str | None = None,
    lead_id: str | None = None,
    project_id: str | None = None,
    interaction_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if project_id:
        verify_project_access(project_id, user, db)
    q = db.query(Interaction).filter(Interaction.tenant_id == user.tenant_id)
    if customer_id:
        q = q.filter(Interaction.customer_id == customer_id)
    if lead_id:
        q = q.filter(Interaction.lead_id == lead_id)
    if project_id:
        q = q.filter(Interaction.project_id == project_id)
    if interaction_type:
        q = q.filter(Interaction.interaction_type == interaction_type)
    return q.order_by(Interaction.interaction_date.desc()).all()


@router.post("/interactions")
def create_interaction(
    req: InteractionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interaction = Interaction(
        tenant_id=user.tenant_id,
        performed_by=user.id,
        performed_by_name=user.name,
        **req.model_dump(),
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.get("/interactions/upcoming-actions")
def upcoming_actions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cutoff = today_jst() + timedelta(days=7)
    interactions = (
        db.query(Interaction)
        .filter(
            Interaction.tenant_id == user.tenant_id,
            Interaction.next_action_date != None,  # noqa: E711
            Interaction.next_action_date <= cutoff,
        )
        .order_by(Interaction.next_action_date.asc())
        .all()
    )
    return interactions


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Dashboard
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/dashboard")
def crm_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tid = user.tenant_id

    total_customers = db.query(func.count(Customer.id)).filter(Customer.tenant_id == tid).scalar() or 0
    active_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.tenant_id == tid, Customer.status == "active")
        .scalar() or 0
    )

    month_start = today_jst().replace(day=1)
    leads_this_month = (
        db.query(func.count(Lead.id))
        .filter(Lead.tenant_id == tid, Lead.acquired_date >= month_start)
        .scalar() or 0
    )
    leads_won_this_month = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.tenant_id == tid,
            Lead.status == "won",
            Lead.converted_date >= month_start,
        )
        .scalar() or 0
    )

    total_contract_value = (
        db.query(func.sum(Customer.total_contract_amount))
        .filter(Customer.tenant_id == tid)
        .scalar() or 0
    )

    # Leads by source
    leads_by_source_rows = (
        db.query(Lead.source, func.count(Lead.id))
        .filter(Lead.tenant_id == tid)
        .group_by(Lead.source)
        .all()
    )
    leads_by_source = {row[0]: row[1] for row in leads_by_source_rows}

    # Customers by rank
    customers_by_rank_rows = (
        db.query(Customer.rank, func.count(Customer.id))
        .filter(Customer.tenant_id == tid, Customer.rank != None)  # noqa: E711
        .group_by(Customer.rank)
        .all()
    )
    customers_by_rank = {row[0]: row[1] for row in customers_by_rank_rows}

    # Upcoming actions count
    cutoff = today_jst() + timedelta(days=7)
    upcoming_actions_count = (
        db.query(func.count(Interaction.id))
        .filter(
            Interaction.tenant_id == tid,
            Interaction.next_action_date != None,  # noqa: E711
            Interaction.next_action_date <= cutoff,
        )
        .scalar() or 0
    )

    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "leads_this_month": leads_this_month,
        "leads_won_this_month": leads_won_this_month,
        "total_contract_value": total_contract_value,
        "leads_by_source": leads_by_source,
        "customers_by_rank": customers_by_rank,
        "upcoming_actions": upcoming_actions_count,
    }
