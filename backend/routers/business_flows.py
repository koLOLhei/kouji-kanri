"""業務フローAPI: 出来高→請求書変換、瑕疵点検リマインド、テナント停止"""
from config import app_settings

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.tenant import Tenant
from models.project import Project
from models.work_package import MonthlyProgress, DefectRecord
from models.business_docs import Invoice
from services.auth_service import get_current_user, require_role
from services.project_access import verify_project_access

router = APIRouter(tags=["business-flows"])


# ─── 1. 出来高→請求書 自動生成 ───

class AutoInvoiceRequest(BaseModel):
    year_month: str  # "2026-04"
    customer_name: str | None = None
    due_date: date | None = None

@router.post("/api/projects/{project_id}/invoices/from-progress")
def create_invoice_from_progress(
    project_id: str,
    req: AutoInvoiceRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """月次出来高から請求書を自動生成"""
    verify_project_access(project_id, user, db)
    project = db.query(Project).filter(Project.id == project_id).first()

    # 当月の出来高を集計
    progress_records = db.query(MonthlyProgress).filter(
        MonthlyProgress.project_id == project_id,
        MonthlyProgress.year_month == req.year_month,
    ).all()

    if not progress_records:
        raise HTTPException(status_code=400, detail=f"{req.year_month}の出来高データがありません")

    total_progress = sum(r.progress_amount for r in progress_records)

    # 請求書番号採番
    count = db.query(func.count(Invoice.id)).filter(Invoice.tenant_id == user.tenant_id).scalar()
    year = date.today().year

    items = [{"description": f"{req.year_month} 出来高", "amount": total_progress}]
    tax_amount = int(total_progress * 0.10)

    invoice = Invoice(
        tenant_id=user.tenant_id,
        project_id=project_id,
        invoice_number=f"INV-{year}-{count + 1:03d}",
        invoice_date=date.today(),
        due_date=req.due_date or (date.today() + timedelta(days=30)),
        customer_name=req.customer_name or project.client_name or "",
        period_from=date(int(req.year_month[:4]), int(req.year_month[5:7]), 1),
        items=items,
        subtotal=total_progress,
        tax_rate=10.0,
        tax_amount=tax_amount,
        total=total_progress + tax_amount,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "total": invoice.total,
        "source_year_month": req.year_month,
        "progress_records": len(progress_records),
    }


# ─── 2. 瑕疵1年/2年点検リマインド ───

@router.get("/api/warranty-reminders")
def warranty_reminders(
    days_ahead: int = 30,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """瑕疵担保期間内の点検リマインドを返す"""
    today = date.today()
    upcoming = today + timedelta(days=days_ahead)

    # 完了した案件で引渡日がある
    projects = db.query(Project).filter(
        Project.tenant_id == user.tenant_id,
        Project.status.in_(["handover", "warranty", "closed"]),
    ).all()

    reminders = []
    for proj in projects:
        end = proj.end_date
        if not end:
            continue

        # 1年点検
        one_year = date(end.year + 1, end.month, end.day) if end else None
        if one_year and today <= one_year <= upcoming:
            reminders.append({
                "project_id": proj.id,
                "project_name": proj.name,
                "type": "1年点検",
                "due_date": one_year.isoformat(),
                "days_until": (one_year - today).days,
            })

        # 2年点検
        two_year = date(end.year + 2, end.month, end.day) if end else None
        if two_year and today <= two_year <= upcoming:
            reminders.append({
                "project_id": proj.id,
                "project_name": proj.name,
                "type": "2年点検",
                "due_date": two_year.isoformat(),
                "days_until": (two_year - today).days,
            })

        # 瑕疵レコードの保証期限
        defects = db.query(DefectRecord).filter(
            DefectRecord.project_id == proj.id,
            DefectRecord.warranty_period_end != None,
            DefectRecord.warranty_period_end >= today,
            DefectRecord.warranty_period_end <= upcoming,
        ).all()
        for d in defects:
            reminders.append({
                "project_id": proj.id,
                "project_name": proj.name,
                "type": f"瑕疵保証期限: {d.title}",
                "due_date": d.warranty_period_end.isoformat(),
                "days_until": (d.warranty_period_end - today).days,
            })

    reminders.sort(key=lambda r: r["days_until"])
    return {"total": len(reminders), "reminders": reminders}


# ─── 3. テナント利用停止（料金未払い）───

class TenantSuspendRequest(BaseModel):
    reason: str = "payment_overdue"

@router.put("/api/admin/tenants/{tenant_id}/suspend")
def suspend_tenant(
    tenant_id: str,
    req: TenantSuspendRequest,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    """テナントを利用停止にする（管理者のみ）"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")
    tenant.is_active = False
    settings = tenant.settings or {}
    settings["suspended"] = True
    settings["suspend_reason"] = req.reason
    settings["suspended_at"] = datetime.now(timezone.utc).isoformat()
    tenant.settings = settings
    db.commit()
    return {"status": "suspended", "tenant_id": tenant_id, "reason": req.reason}


@router.put("/api/admin/tenants/{tenant_id}/reactivate")
def reactivate_tenant(
    tenant_id: str,
    user: User = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    """テナントを再有効化する"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")
    tenant.is_active = True
    settings = tenant.settings or {}
    settings["suspended"] = False
    settings.pop("suspend_reason", None)
    settings["reactivated_at"] = datetime.now(timezone.utc).isoformat()
    tenant.settings = settings
    db.commit()
    return {"status": "active", "tenant_id": tenant_id}


# ─── 4. 全案件横串の日報一覧 ───

@router.get("/api/daily-reports/cross-project")
def cross_project_daily_reports(
    report_date: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """全案件の日報を横断で一覧（管理者向け）"""
    from models.daily_report import DailyReport

    target_date = report_date or date.today()

    reports = db.query(DailyReport, Project.name).join(
        Project, DailyReport.project_id == Project.id
    ).filter(
        Project.tenant_id == user.tenant_id,
        DailyReport.report_date == target_date,
    ).order_by(Project.name).all()

    return {
        "date": target_date.isoformat(),
        "total": len(reports),
        "reports": [
            {
                "project_name": proj_name,
                "project_id": dr.project_id,
                "weather_morning": dr.weather_morning,
                "weather_afternoon": dr.weather_afternoon,
                "worker_count": dr.worker_count,
                "work_description": (dr.work_description or "")[:200],
                "status": dr.status,
            }
            for dr, proj_name in reports
        ],
    }
