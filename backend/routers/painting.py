"""戸建てサイリング塗装工事 — 現地調査〜見積〜契約〜施工〜報告の一気通貫"""

import secrets
from datetime import date, datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from jinja2 import Template
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.painting_project import (
    PaintingSurvey, PaintingEstimate, PaintingContract,
    ContractTemplate, PaintingSchedule,
)
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.email_service import send_email

router = APIRouter(tags=["painting"])


# ============================================================
#  Schemas
# ============================================================

class SurveyCreate(BaseModel):
    client_name: str
    client_address: str | None = None
    client_phone: str | None = None
    client_email: str | None = None
    building_type: str | None = None
    building_age: int | None = None
    floors: int | None = None
    structure: str | None = None
    wall_area_m2: float | None = None
    window_area_m2: float | None = None
    caulking_length_m: float | None = None
    roof_area_m2: float | None = None
    current_condition: dict | None = None
    survey_photo_ids: dict | None = None
    client_requests: str | None = None
    preferred_colors: str | None = None
    budget_range: str | None = None
    preferred_timing: str | None = None
    surveyor_name: str | None = None
    survey_date: date | None = None
    notes: str | None = None


class SurveyUpdate(BaseModel):
    client_name: str | None = None
    client_address: str | None = None
    client_phone: str | None = None
    client_email: str | None = None
    building_type: str | None = None
    building_age: int | None = None
    floors: int | None = None
    structure: str | None = None
    wall_area_m2: float | None = None
    window_area_m2: float | None = None
    caulking_length_m: float | None = None
    roof_area_m2: float | None = None
    current_condition: dict | None = None
    survey_photo_ids: dict | None = None
    client_requests: str | None = None
    preferred_colors: str | None = None
    budget_range: str | None = None
    preferred_timing: str | None = None
    surveyor_name: str | None = None
    survey_date: date | None = None
    status: str | None = None
    notes: str | None = None


class EstimateItemSchema(BaseModel):
    name: str
    area_m2: float
    unit_price: int
    paint_type: str | None = None
    manufacturer: str | None = None
    product_name: str | None = None


class CaulkingItemSchema(BaseModel):
    type: str
    length_m: float
    unit_price: int


class EstimateCreate(BaseModel):
    items: list[EstimateItemSchema]
    scaffold_type: str | None = None
    scaffold_vendor: str | None = None
    scaffold_cost: int = 0
    caulking_items: list[CaulkingItemSchema] | None = None
    material_cost: int = 0
    subcontractor_name: str | None = None
    subcontractor_quote: int | None = None


class EstimateUpdate(BaseModel):
    items: list[EstimateItemSchema] | None = None
    scaffold_type: str | None = None
    scaffold_vendor: str | None = None
    scaffold_cost: int | None = None
    caulking_items: list[CaulkingItemSchema] | None = None
    material_cost: int | None = None
    subcontractor_name: str | None = None
    subcontractor_quote: int | None = None
    our_quote: int | None = None
    status: str | None = None
    valid_until: date | None = None
    notes: str | None = None


class PaymentScheduleItem(BaseModel):
    label: str
    rate: float  # %


class ContractCreate(BaseModel):
    payment_schedule: list[PaymentScheduleItem]
    construction_start: date
    construction_end: date
    template_id: str | None = None


class ContractSendBody(BaseModel):
    to_email: str | None = None  # Override survey email if needed


class SignBody(BaseModel):
    agreed: bool
    signer_name: str


class TemplateCreate(BaseModel):
    name: str
    template_type: str
    body_html: str
    appendix_html: str | None = None


class TemplateUpdate(BaseModel):
    name: str | None = None
    template_type: str | None = None
    body_html: str | None = None
    appendix_html: str | None = None
    is_default: bool | None = None


class ScheduleStepUpdate(BaseModel):
    status: str | None = None
    actual_start: date | None = None
    actual_end: date | None = None
    photo_ids: dict | None = None
    notes: str | None = None


# ============================================================
#  Helpers
# ============================================================

def _gen_number(prefix: str, model_cls, tenant_id: str, db: Session) -> str:
    year = datetime.now(timezone.utc).year
    full_prefix = f"{prefix}-{year}-"
    count = db.query(func.count(model_cls.id)).filter(
        model_cls.tenant_id == tenant_id,
    ).scalar() or 0
    return f"{full_prefix}{count + 1:03d}"


# ============================================================
#  Survey (現地調査・ヒアリング)
# ============================================================

@router.get("/api/painting/surveys")
def list_surveys(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(PaintingSurvey)
        .filter(PaintingSurvey.tenant_id == user.tenant_id)
        .order_by(PaintingSurvey.created_at.desc())
        .all()
    )


@router.post("/api/painting/surveys", status_code=201)
def create_survey(
    req: SurveyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = req.model_dump()
    # Auto-calc net painting area
    if data.get("wall_area_m2") is not None and data.get("window_area_m2") is not None:
        net = data["wall_area_m2"] - data["window_area_m2"]
        data["net_painting_area_m2"] = net
    survey = PaintingSurvey(tenant_id=user.tenant_id, **data)
    db.add(survey)
    db.commit()
    db.refresh(survey)
    return survey


@router.get("/api/painting/surveys/{survey_id}")
def get_survey(
    survey_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    survey = db.query(PaintingSurvey).filter(
        PaintingSurvey.id == survey_id,
        PaintingSurvey.tenant_id == user.tenant_id,
    ).first()
    if not survey:
        raise HTTPException(status_code=404, detail="調査記録が見つかりません")
    return survey


@router.put("/api/painting/surveys/{survey_id}")
def update_survey(
    survey_id: str,
    req: SurveyUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    survey = db.query(PaintingSurvey).filter(
        PaintingSurvey.id == survey_id,
        PaintingSurvey.tenant_id == user.tenant_id,
    ).first()
    if not survey:
        raise HTTPException(status_code=404, detail="調査記録が見つかりません")
    updates = req.model_dump(exclude_unset=True)
    # Recalc net area if wall or window changed
    wall = updates.get("wall_area_m2", survey.wall_area_m2)
    window = updates.get("window_area_m2", survey.window_area_m2)
    if wall is not None and window is not None:
        updates["net_painting_area_m2"] = wall - window
    for k, v in updates.items():
        setattr(survey, k, v)
    db.commit()
    db.refresh(survey)
    return survey


# ============================================================
#  Estimate (見積)
# ============================================================

@router.post("/api/painting/surveys/{survey_id}/estimate", status_code=201)
def create_estimate(
    survey_id: str,
    req: EstimateCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    survey = db.query(PaintingSurvey).filter(
        PaintingSurvey.id == survey_id,
        PaintingSurvey.tenant_id == user.tenant_id,
    ).first()
    if not survey:
        raise HTTPException(status_code=404, detail="調査記録が見つかりません")

    # Calc items
    items = []
    items_total = 0
    for item in req.items:
        amount = int(item.area_m2 * item.unit_price)
        items.append({**item.model_dump(), "amount": amount})
        items_total += amount

    # Calc caulking
    caulking_items = []
    caulking_total = 0
    if req.caulking_items:
        for ci in req.caulking_items:
            amount = int(ci.length_m * ci.unit_price)
            caulking_items.append({**ci.model_dump(), "amount": amount})
            caulking_total += amount

    subtotal = items_total + req.scaffold_cost + caulking_total + req.material_cost
    tax_amount = int(subtotal * 0.10)
    total = subtotal + tax_amount
    our_quote = total
    margin = our_quote - (req.subcontractor_quote or 0) - req.material_cost

    estimate = PaintingEstimate(
        tenant_id=user.tenant_id,
        survey_id=survey_id,
        project_id=survey.project_id,
        estimate_number=_gen_number("EST-PNT", PaintingEstimate, user.tenant_id, db),
        items=items,
        scaffold_type=req.scaffold_type,
        scaffold_vendor=req.scaffold_vendor,
        scaffold_cost=req.scaffold_cost,
        caulking_items=caulking_items if caulking_items else None,
        material_cost=req.material_cost,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        subcontractor_name=req.subcontractor_name,
        subcontractor_quote=req.subcontractor_quote,
        our_quote=our_quote,
        margin=margin,
    )
    db.add(estimate)
    db.commit()
    db.refresh(estimate)
    return estimate


@router.get("/api/painting/estimates/{estimate_id}")
def get_estimate(
    estimate_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    est = db.query(PaintingEstimate).filter(
        PaintingEstimate.id == estimate_id,
        PaintingEstimate.tenant_id == user.tenant_id,
    ).first()
    if not est:
        raise HTTPException(status_code=404, detail="見積が見つかりません")
    return est


@router.put("/api/painting/estimates/{estimate_id}")
def update_estimate(
    estimate_id: str,
    req: EstimateUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    est = db.query(PaintingEstimate).filter(
        PaintingEstimate.id == estimate_id,
        PaintingEstimate.tenant_id == user.tenant_id,
    ).first()
    if not est:
        raise HTTPException(status_code=404, detail="見積が見つかりません")

    updates = req.model_dump(exclude_unset=True)

    # Recalculate if items changed
    if "items" in updates:
        items = []
        items_total = 0
        for item in updates["items"]:
            amount = int(item.area_m2 * item.unit_price)
            items.append({**item.model_dump(), "amount": amount})
            items_total += amount
        updates["items"] = items

    if "caulking_items" in updates and updates["caulking_items"] is not None:
        caulking = []
        for ci in updates["caulking_items"]:
            amount = int(ci.length_m * ci.unit_price)
            caulking.append({**ci.model_dump(), "amount": amount})
        updates["caulking_items"] = caulking

    for k, v in updates.items():
        setattr(est, k, v)
    db.commit()
    db.refresh(est)
    return est


# ============================================================
#  Contract (電子契約)
# ============================================================

@router.post("/api/painting/estimates/{estimate_id}/contract", status_code=201)
def create_contract(
    estimate_id: str,
    req: ContractCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    est = db.query(PaintingEstimate).filter(
        PaintingEstimate.id == estimate_id,
        PaintingEstimate.tenant_id == user.tenant_id,
    ).first()
    if not est:
        raise HTTPException(status_code=404, detail="見積が見つかりません")

    survey = db.query(PaintingSurvey).filter(PaintingSurvey.id == est.survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="調査記録が見つかりません")

    # Load template
    template = None
    if req.template_id:
        template = db.query(ContractTemplate).filter(
            ContractTemplate.id == req.template_id,
            ContractTemplate.tenant_id == user.tenant_id,
        ).first()
    if not template:
        template = db.query(ContractTemplate).filter(
            ContractTemplate.tenant_id == user.tenant_id,
            ContractTemplate.template_type == "painting",
            ContractTemplate.is_default == True,
        ).first()

    # Template context
    ctx = {
        "client_name": survey.client_name,
        "client_address": survey.client_address or "",
        "items": est.items or [],
        "scaffold_cost": est.scaffold_cost or 0,
        "caulking_items": est.caulking_items or [],
        "material_cost": est.material_cost or 0,
        "subtotal": est.subtotal,
        "tax_amount": est.tax_amount,
        "total": est.total,
        "construction_start": req.construction_start.isoformat(),
        "construction_end": req.construction_end.isoformat(),
        "wall_area_m2": survey.wall_area_m2,
        "net_painting_area_m2": survey.net_painting_area_m2,
        "current_condition": survey.current_condition or {},
        "building_type": survey.building_type or "",
        "building_age": survey.building_age,
        "floors": survey.floors,
        "structure": survey.structure or "",
    }

    # Render HTML
    contract_html = ""
    appendix_html = ""
    if template:
        try:
            contract_html = Template(template.body_html).render(**ctx)
        except Exception:
            contract_html = template.body_html
        if template.appendix_html:
            try:
                appendix_html = Template(template.appendix_html).render(**ctx)
            except Exception:
                appendix_html = template.appendix_html or ""

    # Payment schedule with amounts
    payment_schedule = []
    for ps in req.payment_schedule:
        amount = int(est.total * ps.rate / 100)
        payment_schedule.append({
            "label": ps.label,
            "rate": ps.rate,
            "amount": amount,
            "status": "pending",
        })

    sign_token = secrets.token_urlsafe(32)

    contract = PaintingContract(
        tenant_id=user.tenant_id,
        survey_id=est.survey_id,
        estimate_id=estimate_id,
        project_id=est.project_id,
        contract_number=_gen_number("CNT-PNT", PaintingContract, user.tenant_id, db),
        contract_html=contract_html,
        appendix_html=appendix_html,
        template_id=req.template_id or (template.id if template else None),
        payment_schedule=payment_schedule,
        total_amount=est.total,
        client_email=survey.client_email,
        sign_token=sign_token,
        construction_start=req.construction_start,
        construction_end=req.construction_end,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    return {
        **{c.name: getattr(contract, c.name) for c in contract.__table__.columns},
        "sign_url": f"/api/public/sign/{sign_token}",
    }


@router.post("/api/painting/contracts/{contract_id}/send")
def send_contract(
    contract_id: str,
    req: ContractSendBody | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contract = db.query(PaintingContract).filter(
        PaintingContract.id == contract_id,
        PaintingContract.tenant_id == user.tenant_id,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="契約が見つかりません")

    to_email = (req.to_email if req and req.to_email else contract.client_email)
    if not to_email:
        raise HTTPException(status_code=400, detail="送信先メールアドレスがありません")

    sign_url = f"/api/public/sign/{contract.sign_token}"
    html_body = f"""
    <h2>塗装工事契約書のご確認</h2>
    <p>契約番号: {contract.contract_number}</p>
    <p>以下のリンクから契約内容をご確認の上、電子署名をお願いいたします。</p>
    <p><a href="{sign_url}">契約書を確認・署名する</a></p>
    """

    result = send_email(
        to=[to_email],
        subject=f"【塗装工事】契約書のご確認 ({contract.contract_number})",
        html_body=html_body,
    )
    contract.status = "sent"
    db.commit()
    return {"message": "送信しました", "result": result}


@router.get("/api/painting/contracts/{contract_id}")
def get_contract(
    contract_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contract = db.query(PaintingContract).filter(
        PaintingContract.id == contract_id,
        PaintingContract.tenant_id == user.tenant_id,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="契約が見つかりません")
    return contract


# ============================================================
#  Electronic Signing (公開API — 認証不要)
# ============================================================

@router.get("/api/public/sign/{sign_token}")
def get_contract_for_signing(
    sign_token: str,
    db: Session = Depends(get_db),
):
    contract = db.query(PaintingContract).filter(
        PaintingContract.sign_token == sign_token,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="契約が見つかりません")
    return {
        "contract_number": contract.contract_number,
        "contract_html": contract.contract_html,
        "appendix_html": contract.appendix_html,
        "payment_schedule": contract.payment_schedule,
        "total_amount": contract.total_amount,
        "construction_start": contract.construction_start,
        "construction_end": contract.construction_end,
        "client_signed": contract.client_signed,
        "status": contract.status,
    }


@router.post("/api/public/sign/{sign_token}")
def sign_contract(
    sign_token: str,
    req: SignBody,
    request: Request,
    db: Session = Depends(get_db),
):
    contract = db.query(PaintingContract).filter(
        PaintingContract.sign_token == sign_token,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="契約が見つかりません")
    if contract.client_signed:
        raise HTTPException(status_code=400, detail="既に署名済みです")
    if not req.agreed:
        raise HTTPException(status_code=400, detail="契約に同意してください")

    contract.client_signed = True
    contract.client_signed_at = datetime.now(timezone.utc)
    contract.client_ip = request.client.host if request.client else None
    contract.status = "client_signed"
    db.commit()
    return {"message": "署名が完了しました", "signer_name": req.signer_name}


# ============================================================
#  Schedule (工程表)
# ============================================================

PAINTING_STEPS = [
    "足場設置",
    "高圧洗浄",
    "下地処理・補修",
    "養生",
    "下塗り",
    "中塗り",
    "上塗り",
    "コーキング打替え",
    "付帯部塗装",
    "クリアコート",
    "足場解体",
    "清掃・最終確認・お引渡し",
]


@router.post("/api/painting/contracts/{contract_id}/generate-schedule", status_code=201)
def generate_painting_schedule(
    contract_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contract = db.query(PaintingContract).filter(
        PaintingContract.id == contract_id,
        PaintingContract.tenant_id == user.tenant_id,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="契約が見つかりません")
    if not contract.construction_start or not contract.construction_end:
        raise HTTPException(status_code=400, detail="工期が設定されていません")
    if not contract.project_id:
        raise HTTPException(status_code=400, detail="プロジェクトIDが紐付いていません")

    # Check scaffold type to adjust step names
    est = db.query(PaintingEstimate).filter(PaintingEstimate.id == contract.estimate_id).first()
    steps = list(PAINTING_STEPS)
    if est and est.scaffold_type == "aerial_lift":
        steps[0] = "作業車配置"
        steps[10] = "作業車撤去"

    # Delete existing schedule for this project
    db.query(PaintingSchedule).filter(PaintingSchedule.project_id == contract.project_id).delete()

    total_days = (contract.construction_end - contract.construction_start).days
    num_steps = len(steps)
    days_per_step = max(total_days / num_steps, 1)

    records = []
    for i, step_name in enumerate(steps):
        start = contract.construction_start + timedelta(days=int(i * days_per_step))
        end = contract.construction_start + timedelta(days=int((i + 1) * days_per_step) - 1)
        if i == num_steps - 1:
            end = contract.construction_end

        s = PaintingSchedule(
            project_id=contract.project_id,
            step_number=i + 1,
            step_name=step_name,
            planned_start=start,
            planned_end=end,
        )
        db.add(s)
        records.append(s)

    db.commit()
    return {"count": len(records), "steps": records}


@router.get("/api/painting/projects/{project_id}/schedule")
def get_schedule(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    return (
        db.query(PaintingSchedule)
        .filter(PaintingSchedule.project_id == project_id)
        .order_by(PaintingSchedule.step_number)
        .all()
    )


@router.put("/api/painting/schedule/{step_id}")
def update_schedule_step(
    step_id: str,
    req: ScheduleStepUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    step = db.query(PaintingSchedule).filter(PaintingSchedule.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="工程が見つかりません")
    verify_project_access(step.project_id, user, db)
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(step, k, v)
    db.commit()
    db.refresh(step)
    return step


@router.put("/api/painting/schedule/{step_id}/complete")
def complete_schedule_step(
    step_id: str,
    req: ScheduleStepUpdate | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    step = db.query(PaintingSchedule).filter(PaintingSchedule.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="工程が見つかりません")
    verify_project_access(step.project_id, user, db)
    step.status = "completed"
    step.actual_end = date.today()
    if not step.actual_start:
        step.actual_start = date.today()
    if req:
        updates = req.model_dump(exclude_unset=True)
        for k, v in updates.items():
            setattr(step, k, v)
    db.commit()
    db.refresh(step)
    return step


# ============================================================
#  Client Portal (公開API — 認証不要)
# ============================================================

@router.get("/api/public/painting-progress/{sign_token}")
def get_painting_progress(
    sign_token: str,
    db: Session = Depends(get_db),
):
    contract = db.query(PaintingContract).filter(
        PaintingContract.sign_token == sign_token,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="契約が見つかりません")
    if not contract.project_id:
        raise HTTPException(status_code=404, detail="プロジェクトが紐付いていません")

    steps = (
        db.query(PaintingSchedule)
        .filter(PaintingSchedule.project_id == contract.project_id)
        .order_by(PaintingSchedule.step_number)
        .all()
    )

    total = len(steps)
    completed = sum(1 for s in steps if s.status == "completed")
    progress_pct = int(completed / total * 100) if total > 0 else 0

    return {
        "contract_number": contract.contract_number,
        "construction_start": contract.construction_start,
        "construction_end": contract.construction_end,
        "steps": [
            {
                "step_number": s.step_number,
                "step_name": s.step_name,
                "status": s.status,
                "planned_start": s.planned_start,
                "planned_end": s.planned_end,
                "actual_start": s.actual_start,
                "actual_end": s.actual_end,
                "photos_count": len(s.photo_ids) if s.photo_ids else 0,
            }
            for s in steps
        ],
        "progress_percent": progress_pct,
    }


# ============================================================
#  Contract Templates
# ============================================================

@router.get("/api/painting/templates")
def list_templates(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(ContractTemplate)
        .filter(ContractTemplate.tenant_id == user.tenant_id)
        .order_by(ContractTemplate.created_at.desc())
        .all()
    )


@router.post("/api/painting/templates", status_code=201)
def create_template(
    req: TemplateCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tmpl = ContractTemplate(
        tenant_id=user.tenant_id,
        name=req.name,
        template_type=req.template_type,
        body_html=req.body_html,
        appendix_html=req.appendix_html,
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.put("/api/painting/templates/{template_id}")
def update_template(
    template_id: str,
    req: TemplateUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tmpl = db.query(ContractTemplate).filter(
        ContractTemplate.id == template_id,
        ContractTemplate.tenant_id == user.tenant_id,
    ).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="テンプレートが見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(tmpl, k, v)
    db.commit()
    db.refresh(tmpl)
    return tmpl


# ============================================================
#  Report Generation
# ============================================================

@router.post("/api/painting/projects/{project_id}/report")
def generate_completion_report(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)

    steps = (
        db.query(PaintingSchedule)
        .filter(PaintingSchedule.project_id == project_id)
        .order_by(PaintingSchedule.step_number)
        .all()
    )
    survey = db.query(PaintingSurvey).filter(PaintingSurvey.project_id == project_id).first()

    report_html = f"""
    <html><head><meta charset='utf-8'><title>施工完了報告書</title></head><body>
    <h1>施工完了報告書</h1>
    <h2>物件情報</h2>
    <p>お客様名: {survey.client_name if survey else '---'}</p>
    <p>住所: {survey.client_address if survey else '---'}</p>
    <p>建物種別: {survey.building_type if survey else '---'}</p>
    <h2>工程一覧</h2>
    <table border='1'><tr><th>No.</th><th>工程</th><th>状況</th><th>写真枚数</th></tr>
    """
    for s in steps:
        photo_count = len(s.photo_ids) if s.photo_ids else 0
        report_html += f"<tr><td>{s.step_number}</td><td>{s.step_name}</td><td>{s.status}</td><td>{photo_count}</td></tr>"
    report_html += "</table></body></html>"

    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=report_html).write_pdf()
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=report_{project_id}.pdf"},
        )
    except ImportError:
        return {"html": report_html, "note": "WeasyPrint未インストール。HTML形式で返却。"}
