"""CRMのPydanticスキーマ (crm.pyから分離)"""

from datetime import date
from pydantic import BaseModel

class BrandCreate(BaseModel):
    name: str
    trade_type: str | None = None
    license_number: str | None = None
    representative: str | None = None
    address: str | None = None
    phone: str | None = None
    acquired_date: date | None = None
    notes: str | None = None



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



class ContactCreate(BaseModel):
    name: str
    department: str | None = None
    position: str | None = None
    phone: str | None = None
    mobile: str | None = None
    email: str | None = None
    is_primary: bool = False
    is_decision_maker: bool = False



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



