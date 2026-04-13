"""外部システム連携API — Webhook/APIキー/iCal出力（APIファースト設計）"""

import hashlib
import secrets
import uuid
from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import String, Boolean, DateTime, JSON
from sqlalchemy.orm import Mapped, Session, mapped_column

from database import Base, get_db
from models.client_portal import InspectionScheduleTemplate
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(
    prefix="/api/integrations",
    tags=["integrations"],
)


# ── インラインモデル ──────────────────────────────────────────────────────────

class WebhookConfig(Base):
    """Webhook設定"""
    __tablename__ = "webhook_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    events: Mapped[dict] = mapped_column(JSON, default=list)
    secret: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApiKey(Base):
    """外部APIキー"""
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(8), nullable=False)
    scopes: Mapped[dict] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── 定数 ──────────────────────────────────────────────────────────────────────

VALID_EVENTS = [
    "daily_report.submitted",
    "photo.uploaded",
    "inspection.completed",
    "phase.completed",
    "document.generated",
    "ncr.created",
]

VALID_SCOPES = [
    "read:projects",
    "read:photos",
    "read:daily_reports",
    "write:photos",
    "read:inspections",
]


# ── スキーマ ─────────────────────────────────────────────────────────────────

class WebhookCreate(BaseModel):
    name: str
    url: str
    events: list[str] = Field(
        ...,
        description=f"有効イベント: {VALID_EVENTS}",
    )
    secret: str | None = None


class WebhookResponse(BaseModel):
    id: str
    name: str
    url: str
    events: list[str]
    is_active: bool

    model_config = {"from_attributes": True}


class ApiKeyCreate(BaseModel):
    name: str
    scopes: list[str] = Field(
        ...,
        description=f"有効スコープ: {VALID_SCOPES}",
    )


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    last_used_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreatedResponse(BaseModel):
    """作成直後のみ生のキーを返す"""
    id: str
    name: str
    key: str
    key_prefix: str
    scopes: list[str]
    created_at: datetime


# ── SSRF防止 ──────────────────────────────────────────────────────────────────

import ipaddress
from urllib.parse import urlparse

_BLOCKED_HOSTS = {
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "metadata.google.internal", "169.254.169.254",  # Cloud metadata
}

_BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


def _validate_webhook_url(url: str) -> None:
    """Validate webhook URL to prevent SSRF attacks."""
    parsed = urlparse(url)

    # Must be HTTPS in production
    if parsed.scheme not in ("https", "http"):
        raise HTTPException(400, "Webhook URLはhttpsまたはhttpである必要があります")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(400, "無効なURLです")

    # Block known internal hostnames
    if hostname.lower() in _BLOCKED_HOSTS:
        raise HTTPException(400, "内部ネットワークのURLは指定できません")

    # Block private/reserved IP ranges
    try:
        addr = ipaddress.ip_address(hostname)
        for net in _BLOCKED_NETWORKS:
            if addr in net:
                raise HTTPException(400, "プライベートIPアドレスは指定できません")
    except ValueError:
        pass  # Not an IP literal (hostname) - OK

    # Block common internal patterns
    lower = hostname.lower()
    if any(p in lower for p in ["internal", ".local", "metadata", ".svc.cluster"]):
        raise HTTPException(400, "内部ネットワークのURLは指定できません")


# ── Webhook エンドポイント ──────────────────────────────────────────────────

@router.get("/webhooks", response_model=list[WebhookResponse])
def list_webhooks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """テナントに設定されたWebhook一覧"""
    hooks = db.query(WebhookConfig).filter(
        WebhookConfig.tenant_id == user.tenant_id,
    ).order_by(WebhookConfig.created_at.desc()).all()
    return hooks


@router.post("/webhooks", response_model=WebhookResponse)
def create_webhook(
    req: WebhookCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Webhook登録"""

    # イベント検証
    invalid = [e for e in req.events if e not in VALID_EVENTS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"無効なイベント: {invalid}。有効値: {VALID_EVENTS}",
        )

    # SSRF防止: URLバリデーション
    _validate_webhook_url(req.url)

    hook = WebhookConfig(
        tenant_id=user.tenant_id,
        name=req.name,
        url=req.url,
        events=req.events,
        secret=req.secret,
    )
    db.add(hook)
    db.commit()
    db.refresh(hook)
    return hook


@router.delete("/webhooks/{webhook_id}")
def delete_webhook(
    webhook_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Webhook削除"""
    wh = db.query(WebhookConfig).filter(
        WebhookConfig.id == webhook_id,
        WebhookConfig.tenant_id == user.tenant_id,
    ).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(wh)
    db.commit()
    return {"status": "ok"}


# ── APIキー エンドポイント ──────────────────────────────────────────────────

@router.get("/api-keys", response_model=list[ApiKeyResponse])
def list_api_keys(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """テナントのAPIキー一覧（キー本体は非表示）"""
    keys = db.query(ApiKey).filter(
        ApiKey.tenant_id == user.tenant_id,
    ).order_by(ApiKey.created_at.desc()).all()
    return keys


@router.post("/api-keys", response_model=ApiKeyCreatedResponse)
def create_api_key(
    req: ApiKeyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """APIキーを発行（生のキーは作成時のみ返す）"""

    # スコープ検証
    invalid = [s for s in req.scopes if s not in VALID_SCOPES]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"無効なスコープ: {invalid}。有効値: {VALID_SCOPES}",
        )

    # ランダムキー生成
    raw_key = f"kk_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]

    api_key = ApiKey(
        tenant_id=user.tenant_id,
        name=req.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        scopes=req.scopes,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return ApiKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key=raw_key,
        key_prefix=key_prefix,
        scopes=req.scopes,
        created_at=api_key.created_at,
    )


@router.delete("/api-keys/{key_id}")
def delete_api_key(
    key_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """APIキー削除"""
    key = db.query(ApiKey).filter(
        ApiKey.id == key_id,
        ApiKey.tenant_id == user.tenant_id,
    ).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")
    db.delete(key)
    db.commit()
    return {"status": "ok"}


# ── iCal エクスポート ──────────────────────────────────────────────────────

@router.get("/ical/{project_id}", response_class=Response)
def export_ical(
    project_id: str,
    token: str | None = None,
    db: Session = Depends(get_db),
):
    """点検スケジュールをiCal形式でエクスポート。

    外部カレンダーアプリ（Google Calendar/Outlook等）はAuthorizationヘッダーを
    送れないため、クエリパラメータ ``?token=JWT`` での認証もサポートする。
    """
    from services.auth_service import decode_token as _decode
    from models.project import Project

    if not token:
        raise HTTPException(status_code=401, detail="tokenパラメータが必要です（例: ?token=YOUR_JWT）")

    try:
        payload = _decode(token)
    except HTTPException:
        raise HTTPException(status_code=401, detail="無効なトークンです")

    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=401, detail="無効なトークンです")

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from models.inspection import Inspection
    from models.milestone import Milestone

    schedules = db.query(InspectionScheduleTemplate).filter(
        InspectionScheduleTemplate.facility_id == project_id,
        InspectionScheduleTemplate.is_active == True,
        InspectionScheduleTemplate.next_due.isnot(None),
    ).all()

    # 通常の検査予定も取得
    inspections = db.query(Inspection).filter(
        Inspection.project_id == project_id,
        Inspection.scheduled_date.isnot(None),
    ).all()

    # マイルストーンも取得
    milestones = db.query(Milestone).filter(
        Milestone.project_id == project_id,
        Milestone.due_date.isnot(None),
    ).all()

    # iCal生成
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//KoujiKanri//InspectionSchedule//JP",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_ical_escape(project.name)} - 工事予定",
    ]

    # 定期点検スケジュール
    for sched in schedules:
        uid = f"{sched.id}@kouji-kanri"
        dtstart = sched.next_due.strftime("%Y%m%d")
        summary = _ical_escape(sched.name)
        description_parts = []
        if sched.legal_basis:
            description_parts.append(f"法的根拠: {sched.legal_basis}")
        if sched.category:
            description_parts.append(f"区分: {sched.category}")
        if sched.assigned_company:
            description_parts.append(f"担当: {sched.assigned_company}")
        description = _ical_escape("\\n".join(description_parts))

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            "END:VEVENT",
        ])

    # 通常の検査予定
    for insp in inspections:
        uid = f"insp-{insp.id}@kouji-kanri"
        dtstart = insp.scheduled_date.strftime("%Y%m%d")
        summary = _ical_escape(f"[検査] {insp.title}")
        desc_parts = [f"種別: {insp.inspection_type or ''}"]
        if getattr(insp, 'inspector_name', None):
            desc_parts.append(f"検査員: {insp.inspector_name}")
        description = _ical_escape("\\n".join(desc_parts))
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            "END:VEVENT",
        ])

    # マイルストーン
    for ms in milestones:
        uid = f"ms-{ms.id}@kouji-kanri"
        dtstart = ms.due_date.strftime("%Y%m%d")
        summary = _ical_escape(f"[MS] {ms.title}")
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"SUMMARY:{summary}",
            "END:VEVENT",
        ])

    lines.append("END:VCALENDAR")
    ical_content = "\r\n".join(lines)

    return Response(
        content=ical_content,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=inspections.ics"},
    )


def _ical_escape(text: str) -> str:
    """iCalフィールド用のエスケープ"""
    return (
        text
        .replace("\\", "\\\\")
        .replace(",", "\\,")
        .replace(";", "\\;")
        .replace("\n", "\\n")
    )
