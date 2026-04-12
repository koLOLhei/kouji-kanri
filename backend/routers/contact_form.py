"""問い合わせフォーム受信 — 公開API（KAMO HP用）"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.crm import Lead
from services.email_service import send_email

router = APIRouter(prefix="/api/public", tags=["public"])

DEFAULT_TENANT_ID = "e1adb115-ad1b-45d8-8a35-144d8e0bee0e"


class ContactFormRequest(BaseModel):
    name: str
    email: str
    phone: str = ""
    inquiry_type: str = "その他"
    message: str


@router.post("/contact")
def receive_contact_form(req: ContactFormRequest, db: Session = Depends(get_db)):
    """問い合わせフォームからの送信を保存+メール通知"""

    from datetime import date

    # CRMにリードとして保存
    lead = Lead(
        tenant_id=DEFAULT_TENANT_ID,
        source="contact_form",
        source_detail="kamo.soara-mu.jp",
        acquired_date=date.today(),
        company_name=req.name,
        contact_name=req.name,
        contact_phone=req.phone,
        contact_email=req.email,
        description=f"【{req.inquiry_type}】\n{req.message}",
        priority="B",
        status="new",
    )
    db.add(lead)
    db.commit()

    # メール送信
    email_body = f"""
    <div style="font-family:sans-serif;max-width:600px;">
      <div style="background:#1a1a1a;color:white;padding:20px;">
        <h2 style="margin:0;">【KAMO】お問い合わせフォーム</h2>
        <p style="margin:5px 0 0;opacity:0.7;">kamo.soara-mu.jp</p>
      </div>
      <div style="padding:20px;border:1px solid #eee;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;width:100px;">お名前</td><td style="padding:8px;border-bottom:1px solid #eee;">{req.name}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">メール</td><td style="padding:8px;border-bottom:1px solid #eee;">{req.email}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">電話番号</td><td style="padding:8px;border-bottom:1px solid #eee;">{req.phone or '未入力'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">種別</td><td style="padding:8px;border-bottom:1px solid #eee;">{req.inquiry_type}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">内容</td><td style="padding:8px;white-space:pre-wrap;">{req.message}</td></tr>
        </table>
      </div>
    </div>"""

    send_email(
        to=["contact@soara-mu.com"],
        subject=f"【KAMO】お問い合わせ: {req.inquiry_type} - {req.name}様",
        html_body=email_body,
    )

    return {"status": "ok"}
