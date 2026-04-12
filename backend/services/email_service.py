"""メール送信サービス — Resend API"""

import os
import logging
import json
from urllib.request import Request, urlopen
from urllib.error import URLError

from config import settings

logger = logging.getLogger(__name__)

RESEND_API_KEY = settings.resend_api_key or os.getenv("RESEND_API_KEY", "")
MAIL_FROM = settings.smtp_from or os.getenv("SMTP_FROM", "noreply@kouji.soara-mu.jp")


def send_email(to: list[str], subject: str, html_body: str,
               cc: list[str] = None, reply_to: str = None) -> dict:
    """Resend APIでメール送信。APIキー未設定時はログ出力のみ。"""

    if not RESEND_API_KEY:
        logger.info(f"[EMAIL-DEV] To: {to}, Subject: {subject}")
        return {"status": "dev_mode", "message": "RESEND_API_KEY未設定"}

    try:
        payload = {
            "from": MAIL_FROM,
            "to": to,
            "subject": subject,
            "html": html_body,
        }
        if cc:
            payload["cc"] = cc
        if reply_to:
            payload["reply_to"] = reply_to

        data = json.dumps(payload).encode("utf-8")
        req = Request(
            "https://api.resend.com/emails",
            data=data,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "kouji-kanri/1.0",
            },
            method="POST",
        )
        with urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            logger.info(f"[EMAIL] Sent to {to}: {subject} → {result.get('id','')}")
            return {"status": "sent", "id": result.get("id", "")}

    except URLError as e:
        detail = ""
        if hasattr(e, 'read'):
            try:
                detail = e.read().decode('utf-8')
            except Exception:
                pass
        logger.error(f"[EMAIL] Resend API error: {e} | detail: {detail}")
        return {"status": "failed", "error": str(e), "detail": detail}
    except Exception as e:
        logger.error(f"[EMAIL] Failed: {e}")
        return {"status": "failed", "error": str(e)}


def send_progress_email(
    recipients: list[str], project_name: str, progress_percent: int,
    portal_url: str, today_summary: str = "", cc: list[str] = None,
) -> dict:
    """顧客向け進捗メール送信"""
    subject = f"【工事進捗】{project_name} - 進捗{progress_percent}%"
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:18px;">工事進捗レポート</h1>
        <p style="margin:8px 0 0;opacity:0.9;">{project_name}</p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;">
        <div style="text-align:center;margin:16px 0;">
          <span style="font-size:48px;font-weight:bold;color:#1e40af;">{progress_percent}%</span>
          <p style="color:#6b7280;margin:4px 0;">工程進捗率</p>
        </div>
        {f'<div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0;color:#374151;">{today_summary}</p></div>' if today_summary else ''}
        <div style="text-align:center;margin:24px 0;">
          <a href="{portal_url}" style="display:inline-block;background:#2563eb;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">進捗を確認する</a>
        </div>
      </div>
      <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px;">工事管理SaaS | 自動送信メール</div>
    </div>"""
    return send_email(recipients, subject, html, cc=cc)


def send_approval_notification(to_email: str, entity_type: str, entity_title: str, action: str) -> dict:
    """承認アクション通知メールを送信する。"""
    actions = {"approved": "承認", "rejected": "却下", "returned": "差し戻し"}
    action_ja = actions.get(action, action)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">[工事管理] 承認通知</h2>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;">
        <p>{entity_title}が<strong>{action_ja}</strong>されました。</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://kouji.soara-mu.jp" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">システムで確認する</a>
        </div>
      </div>
    </div>"""
    return send_email([to_email], f"[工事管理] {entity_title}が{action_ja}されました", html)


def send_deadline_alert(to_email: str, item_title: str, days_left: int) -> dict:
    """期限アラートメールを送信する。"""
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#dc2626;color:white;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">[工事管理] 期限アラート</h2>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;">
        <p><strong>{item_title}</strong>の期限まであと<strong>{days_left}日</strong>です。</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://kouji.soara-mu.jp" style="background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">確認する</a>
        </div>
      </div>
    </div>"""
    return send_email([to_email], f"[工事管理] {item_title}の期限が{days_left}日後です", html)


def send_password_reset_email(to_email: str, reset_token: str) -> dict:
    """パスワードリセットメールを送信する。"""
    reset_url = f"https://kouji.soara-mu.jp/reset-password?token={reset_token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">[工事管理] パスワードリセット</h2>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;">
        <p>パスワードリセットのリクエストを受け付けました。</p>
        <p>以下のボタンをクリックしてパスワードをリセットしてください（24時間有効）。</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{reset_url}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">パスワードをリセットする</a>
        </div>
        <p style="color:#6b7280;font-size:12px;">このメールに心当たりがない場合は無視してください。</p>
      </div>
    </div>"""
    return send_email([to_email], "[工事管理] パスワードリセット", html)
