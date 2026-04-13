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
from services.timezone_utils import today_jst

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
        acquired_date=today_jst(),
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

    # 自動フォローアップ: CRM通知を生成して営業が即対応できるようにする
    try:
        from models.notification import Notification
        # 全admin/managerユーザーに通知
        from models.user import User
        admins = db.query(User).filter(
            User.tenant_id == tenant_id,
            User.role.in_(["admin", "manager"]),
        ).all()
        meta = req.metadata or {}
        for admin in admins:
            notif = Notification(
                tenant_id=tenant_id,
                user_id=admin.id,
                title=f"新規リード: {req.contact_name}様 ({meta.get('service_type', '問い合わせ')})",
                message=f"電話: {req.contact_phone} / 経路: {req.source_detail} / 優先度: {req.priority}",
                notification_type="lead",
                link=f"/leads",
            )
            db.add(notif)
        db.commit()
    except Exception:
        db.rollback()  # 通知失敗してもリード保存は成功させる
    db.refresh(lead)

    # メール通知 → contact@soara-mu.com
    from services.email_service import send_email
    meta = req.metadata or {}
    email_body = f"""
    <div style="font-family: sans-serif; max-width: 600px;">
      <div style="background: #1a1a1a; color: white; padding: 20px;">
        <h2 style="margin: 0;">【KAMO】新規お問い合わせ</h2>
        <p style="margin: 5px 0 0; opacity: 0.7;">kamo.soara-mu.jp チャットボットより</p>
      </div>
      <div style="padding: 20px; border: 1px solid #eee;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">お名前</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.contact_name}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">電話番号</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.contact_phone}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">メール</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.contact_email or '未入力'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">ご相談内容</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{meta.get('service_type', '')}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">建物種類</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{meta.get('building_type', '')}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">エリア</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{meta.get('city', '')}{meta.get('ward', '')}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">時期</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{meta.get('timing', '')}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">予算</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{meta.get('budget', '')}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">緊急度</td><td style="padding: 8px;">{req.priority}</td></tr>
        </table>
      </div>
      <div style="padding: 15px; background: #f5f5f5; text-align: center; font-size: 12px; color: #888;">
        工事管理システムでも確認できます
      </div>
    </div>
    """
    email_result = send_email(
        to=["contact@soara-mu.com"],
        subject=f"【KAMO】新規お問い合わせ: {meta.get('service_type', '工事相談')} - {req.contact_name}様",
        html_body=email_body,
    )

    return {"status": "ok", "lead_id": lead.id, "email_status": email_result.get("status", "unknown"), "email_error": email_result.get("error", ""), "email_detail": email_result.get("detail", "")}
