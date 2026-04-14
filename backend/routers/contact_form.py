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

    from services.timezone_utils import today_jst

    # CRMにリードとして保存
    lead = Lead(
        tenant_id=DEFAULT_TENANT_ID,
        source="contact_form",
        source_detail="kamo.soara-mu.jp",
        acquired_date=today_jst(),
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

    email_result = send_email(
        to=["contact@soara-mu.com"],
        subject=f"【KAMO】お問い合わせ: {req.inquiry_type} - {req.name}様",
        html_body=email_body,
    )

    # お客様への自動返信メール
    if req.email:
        auto_reply = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1a1a1a;color:white;padding:24px;">
            <h1 style="margin:0;font-size:18px;letter-spacing:0.1em;">株式会社KAMO</h1>
            <p style="margin:8px 0 0;opacity:0.6;font-size:12px;">お問い合わせありがとうございます</p>
          </div>
          <div style="padding:24px;border:1px solid #eee;">
            <p style="margin:0 0 16px;color:#1a1a1a;">{req.name} 様</p>
            <p style="color:#555;line-height:1.8;font-size:14px;">
              この度はお問い合わせいただき、誠にありがとうございます。<br>
              内容を確認の上、<strong>2営業日以内</strong>に担当者よりご連絡いたします。
            </p>
            <div style="background:#f8f8f8;padding:16px;margin:20px 0;">
              <p style="margin:0;font-size:12px;color:#888;">お問い合わせ種別:</p>
              <p style="margin:8px 0 0;font-size:14px;color:#333;">{req.inquiry_type}</p>
            </div>
            <p style="color:#555;line-height:1.8;font-size:14px;">
              お急ぎの場合は、下記までお電話ください。<br>
              <strong>TEL: 044-948-9115</strong>（平日 9:00〜18:00）
            </p>
          </div>
          <div style="padding:16px;text-align:center;font-size:11px;color:#aaa;">
            株式会社KAMO | 〒213-0013 神奈川県川崎市高津区末長1-52-37-104<br>
            <a href="https://kamo.soara-mu.jp" style="color:#888;">https://kamo.soara-mu.jp</a>
          </div>
        </div>"""
        send_email(
            to=[req.email],
            subject="【株式会社KAMO】お問い合わせを承りました",
            html_body=auto_reply,
            reply_to="contact@soara-mu.com",
        )

    return {"status": "ok", "email_status": email_result.get("status", "unknown")}
