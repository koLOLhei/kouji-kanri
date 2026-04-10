"""顧客ポータル — 発注者・クライアントへの進捗共有、自動メール通知

設計思想:
- 現場責任者が日報を提出 → 自動でクライアントに進捗メールが飛ぶ
- メールにはワンクリックで進捗が見れるURLが含まれる
- クライアントはログイン不要で、トークン付きURLで閲覧できる
- 見せる範囲はプロジェクト設定で制御（写真/工程/日報/書類）
"""

import uuid
import secrets
from datetime import datetime, timezone, date

from sqlalchemy import String, Integer, Boolean, Date, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ClientPortalConfig(Base):
    """クライアントポータル設定 — プロジェクトごとに何を見せるか"""
    __tablename__ = "client_portal_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    # アクセストークン（URL用）
    access_token: Mapped[str] = mapped_column(String(64), unique=True, default=lambda: secrets.token_urlsafe(32))
    # 表示設定
    show_progress: Mapped[bool] = mapped_column(Boolean, default=True)  # 工程進捗
    show_photos: Mapped[bool] = mapped_column(Boolean, default=True)  # 工事写真
    show_daily_reports: Mapped[bool] = mapped_column(Boolean, default=True)  # 日報
    show_inspections: Mapped[bool] = mapped_column(Boolean, default=True)  # 検査結果
    show_documents: Mapped[bool] = mapped_column(Boolean, default=False)  # 提出書類
    show_costs: Mapped[bool] = mapped_column(Boolean, default=False)  # 原価（通常非公開）
    show_safety: Mapped[bool] = mapped_column(Boolean, default=False)  # 安全管理
    # メール通知設定
    auto_email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    email_trigger: Mapped[str] = mapped_column(String(50), default="daily_report")  # daily_report, weekly, phase_complete
    email_recipients: Mapped[dict | None] = mapped_column(JSON)  # ["client@example.com", ...]
    email_cc: Mapped[dict | None] = mapped_column(JSON)
    # カスタマイズ
    welcome_message: Mapped[str | None] = mapped_column(Text)  # ポータルトップのメッセージ
    company_logo_key: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClientNotificationLog(Base):
    """クライアントへの通知履歴"""
    __tablename__ = "client_notification_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)  # daily_progress, weekly_summary, phase_complete, inspection_result
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    recipients: Mapped[dict | None] = mapped_column(JSON)
    portal_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(30), default="sent")  # sent, failed, pending
    triggered_by: Mapped[str | None] = mapped_column(String(36))  # 誰のアクションがトリガーか
    trigger_event: Mapped[str | None] = mapped_column(String(100))  # daily_report_submitted, phase_completed, etc.
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InspectionScheduleTemplate(Base):
    """定期点検スケジュールテンプレート（施設用）"""
    __tablename__ = "inspection_schedule_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    facility_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # "消防設備点検", "受水槽清掃"
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # fire, water, elevator, electrical, hvac, building
    legal_basis: Mapped[str | None] = mapped_column(String(255))  # "消防法第17条の3の3", "水道法第34条の2"
    frequency: Mapped[str] = mapped_column(String(30), nullable=False)  # monthly, bimonthly, quarterly, semi_annual, annual, biennial
    month_due: Mapped[dict | None] = mapped_column(JSON)  # [4, 10] = 4月と10月
    checklist_items: Mapped[dict | None] = mapped_column(JSON)  # デフォルトチェック項目
    last_performed: Mapped[date | None] = mapped_column(Date)
    next_due: Mapped[date | None] = mapped_column(Date)
    assigned_company: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
