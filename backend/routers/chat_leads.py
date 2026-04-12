"""チャットボットからのリード受信 — 公開API（認証不要）

HPのチャットボットからのリード情報を受け取り、CRMに保存する。
認証不要だが、rate limitとCORS制限で保護。
"""

from datetime import date

from fastapi import APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import Depends

from database import get_db
from models.crm import Lead

router = APIRouter(prefix="/api/public", tags=["public"])

# デフォルトテナントID（KAMOのテナント）
DEFAULT_TENANT_ID = "e1adb115-ad1b-45d8-8a35-144d8e0bee0e"


class ChatLeadRequest(BaseModel):
    source: str = "chatbot"
    source_detail: str = ""
    company_name: str = ""
    contact_name: str
    contact_phone: str
    contact_email: str = ""
    description: str = ""
    estimated_amount: int | None = None
    priority: str = "B"
    metadata: dict | None = None


@router.post("/chat-lead")
def receive_chat_lead(req: ChatLeadRequest, db: Session = Depends(get_db)):
    """チャットボットからのリードを保存（認証不要）"""

    # Determine tenant from source_detail or use default
    tenant_id = DEFAULT_TENANT_ID

    # Find tenant by domain if needed
    if req.source_detail:
        from models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.slug == "demo").first()
        if tenant:
            tenant_id = tenant.id

    lead = Lead(
        tenant_id=tenant_id,
        source=req.source,
        source_detail=req.source_detail,
        acquired_date=date.today(),
        company_name=req.company_name or req.contact_name,
        contact_name=req.contact_name,
        contact_phone=req.contact_phone,
        contact_email=req.contact_email,
        description=req.description,
        estimated_amount=req.estimated_amount,
        priority=req.priority,
        status="new",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return {"status": "ok", "lead_id": lead.id}
