"""メール送信サービス — SMTP or APIベース

実装方式:
1. 環境変数にSMTP設定があればSMTP送信
2. なければログ出力のみ（開発モード）
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@kouji.soara-mu.jp")


def send_email(to: list[str], subject: str, html_body: str,
               cc: list[str] = None, reply_to: str = None) -> dict:
    """メール送信。SMTP未設定時はログ出力のみ。"""

    if not SMTP_HOST or not SMTP_USER:
        logger.info(f"[EMAIL-DEV] To: {to}, Subject: {subject}")
        logger.info(f"[EMAIL-DEV] Body: {html_body[:200]}...")
        return {"status": "dev_mode", "message": "SMTP未設定のためログ出力のみ"}

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = ", ".join(to)
        if cc:
            msg["Cc"] = ", ".join(cc)
        if reply_to:
            msg["Reply-To"] = reply_to

        msg.attach(MIMEText(html_body, "html", "utf-8"))

        all_recipients = to + (cc or [])

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, all_recipients, msg.as_string())

        logger.info(f"[EMAIL] Sent to {to}: {subject}")
        return {"status": "sent"}

    except Exception as e:
        logger.error(f"[EMAIL] Failed: {e}")
        return {"status": "failed", "error": str(e)}


def send_progress_email(
    recipients: list[str],
    project_name: str,
    progress_percent: int,
    portal_url: str,
    today_summary: str = "",
    cc: list[str] = None,
) -> dict:
    """顧客向け進捗メール送信"""
    subject = f"【工事進捗】{project_name} - 進捗{progress_percent}%"

    html = f"""
    <div style="font-family: 'Hiragino Kaku Gothic Pro', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 18px;">工事進捗レポート</h1>
            <p style="margin: 8px 0 0; opacity: 0.9;">{project_name}</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin: 16px 0;">
                <span style="font-size: 48px; font-weight: bold; color: #1e40af;">{progress_percent}%</span>
                <p style="color: #6b7280; margin: 4px 0;">工程進捗率</p>
            </div>
            {f'<div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;"><p style="margin: 0; color: #374151;">{today_summary}</p></div>' if today_summary else ''}
            <div style="text-align: center; margin: 24px 0;">
                <a href="{portal_url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    進捗を確認する
                </a>
            </div>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
            工事管理SaaS | 自動送信メール
        </div>
    </div>
    """

    return send_email(recipients, subject, html, cc=cc)
