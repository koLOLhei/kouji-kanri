"""業務自動化API — 月報集計・完了報告書・保証書・天気取得・労務費計算。"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(tags=["automation"])


# ─── 月報自動集計 ───

@router.get("/api/projects/{project_id}/monthly-report/{year}/{month}")
def get_monthly_report(
    project_id: str, year: int, month: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """日報データから月次サマリーを自動集計。手書き月報が不要に。"""
    verify_project_access(project_id, user, db)
    from services.monthly_report import generate_monthly_report
    return generate_monthly_report(project_id, year, month, db)


# ─── 完了報告書PDF ───

@router.post("/api/projects/{project_id}/completion-report/pdf")
def download_completion_report(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """完了報告書PDFを自動生成。工期・写真・検査結果をまとめた正式書類。"""
    verify_project_access(project_id, user, db)
    from services.completion_report import generate_completion_report_pdf
    try:
        pdf = generate_completion_report_pdf(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''完了報告書_{project_id[:8]}.pdf",
            "Content-Length": str(len(pdf)),
        },
    )


# ─── 保証書PDF ───

class WarrantyRequest(BaseModel):
    client_name: str
    project_name: str
    location: str = ""
    work_description: str = "外壁塗装工事（クリアコート10年保証）"
    warranty_years: int = 10
    completion_date: date | None = None


@router.post("/api/projects/{project_id}/warranty/pdf")
def download_warranty(
    project_id: str,
    req: WarrantyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """保証書PDFを自動生成。クリアコート10年保証等。"""
    verify_project_access(project_id, user, db)
    from services.warranty_generator import generate_warranty_pdf
    pdf = generate_warranty_pdf(
        client_name=req.client_name,
        project_name=req.project_name,
        location=req.location,
        work_description=req.work_description,
        warranty_years=req.warranty_years,
        completion_date=req.completion_date,
    )
    safe_name = req.client_name.replace("/", "-")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''保証書_{safe_name}.pdf",
            "Content-Length": str(len(pdf)),
        },
    )


# ─── バックアップ ───

@router.post("/api/admin/backup")
def run_backup(user: User = Depends(get_current_user)):
    """DB + ファイルの完全バックアップを実行（adminのみ）。"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="管理者のみ実行可能です")
    from services.backup_service import run_full_backup
    return run_full_backup()


@router.post("/api/admin/backup/database")
def backup_db_only(user: User = Depends(get_current_user)):
    """DBダンプのみ実行。"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="管理者のみ実行可能です")
    from services.backup_service import backup_database_to_s3
    return backup_database_to_s3()


# ─── 出来形管理・品質分析 ───

@router.get("/api/projects/{project_id}/quality-analysis")
def get_quality_analysis(
    project_id: str,
    measurement_type: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """出来形測定データの統計分析。Cp/Cpk工程能力指数、ヒストグラム、x̄-R管理図データを自動計算。"""
    verify_project_access(project_id, user, db)
    from services.quality_analysis import analyze_measurements
    return analyze_measurements(project_id, db, measurement_type=measurement_type)


@router.get("/api/projects/{project_id}/measurements/{measurement_id}/auto-judge")
def auto_judge(
    project_id: str, measurement_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """個別測定の規格値との自動照合・合否判定。"""
    verify_project_access(project_id, user, db)
    from models.measurement import Measurement
    from services.quality_analysis import auto_judge_measurement
    m = db.query(Measurement).filter(Measurement.id == measurement_id, Measurement.project_id == project_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="測定データが見つかりません")
    return auto_judge_measurement(m)


# ─── 写真台帳PDF ───

@router.post("/api/projects/{project_id}/photo-ledger/pdf")
def download_photo_ledger(
    project_id: str,
    category: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """写真台帳PDFを自動生成。工種別に写真+黒板情報をA4帳票に整理。"""
    verify_project_access(project_id, user, db)
    from services.photo_ledger import generate_photo_ledger_pdf
    try:
        pdf = generate_photo_ledger_pdf(project_id, db, category=category)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''写真台帳_{project_id[:8]}.pdf",
            "Content-Length": str(len(pdf)),
        },
    )


# ─── 天気自動取得 ───

@router.get("/api/weather/today")
def get_today_weather(
    area: str = "神奈川県東部",
    user: User = Depends(get_current_user),
):
    """気象庁から今日の天気を自動取得。日報の天候欄の手入力を省略。"""
    from services.weather_auto import fetch_today_weather
    result = fetch_today_weather(area)
    if not result:
        raise HTTPException(status_code=503, detail="天気情報を取得できませんでした")
    return result


@router.get("/api/weather/areas")
def list_weather_areas(user: User = Depends(get_current_user)):
    """利用可能な天気取得エリア一覧。"""
    from services.weather_auto import AREA_CODES
    return {name: code for name, code in AREA_CODES.items()}


# ─── 勤怠→原価自動計算 ───

@router.get("/api/projects/{project_id}/labor-cost/{year}/{month}")
def get_labor_cost(
    project_id: str, year: int, month: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """出勤データから労務費を自動計算。二重入力を排除。"""
    verify_project_access(project_id, user, db)
    from services.labor_cost import calculate_labor_cost
    return calculate_labor_cost(project_id, year, month, db)
