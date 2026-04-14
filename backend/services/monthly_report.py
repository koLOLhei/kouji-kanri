"""月報自動集計サービス — 日報データから月次サマリーを自動生成。"""

from datetime import date
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from models.daily_report import DailyReport
from models.photo import Photo
from models.inspection import Inspection
from models.phase import Phase


def generate_monthly_report(project_id: str, year: int, month: int, db: Session) -> dict:
    """指定月の日報データから月報サマリーを自動集計。"""

    reports = db.query(DailyReport).filter(
        DailyReport.project_id == project_id,
        extract('year', DailyReport.report_date) == year,
        extract('month', DailyReport.report_date) == month,
    ).order_by(DailyReport.report_date).all()

    if not reports:
        return {"error": "該当月の日報がありません", "year": year, "month": month}

    # 基本集計
    work_days = len(reports)
    total_workers = sum(r.worker_count or 0 for r in reports)
    avg_workers = round(total_workers / work_days, 1) if work_days > 0 else 0

    # 天候集計
    weather_counts = {}
    for r in reports:
        w = r.weather_morning or "不明"
        weather_counts[w] = weather_counts.get(w, 0) + 1

    # 作業内容サマリー（各日報から作業記述を集約）
    work_descriptions = []
    for r in reports:
        if r.work_description:
            work_descriptions.append({
                "date": r.report_date.isoformat(),
                "description": r.work_description[:200],
                "workers": r.worker_count,
            })

    # 写真枚数
    photo_count = db.query(func.count(Photo.id)).filter(
        Photo.project_id == project_id,
        extract('year', Photo.created_at) == year,
        extract('month', Photo.created_at) == month,
    ).scalar() or 0

    # 検査実績
    inspections = db.query(Inspection).filter(
        Inspection.project_id == project_id,
        extract('year', Inspection.scheduled_date) == year,
        extract('month', Inspection.scheduled_date) == month,
    ).all()

    # 工程進捗
    phases = db.query(Phase).filter(Phase.project_id == project_id).all()
    total_phases = len(phases)
    completed = sum(1 for p in phases if p.status == "completed")
    in_progress = [p.name for p in phases if p.status == "in_progress"]

    return {
        "year": year,
        "month": month,
        "project_id": project_id,
        "summary": {
            "work_days": work_days,
            "total_workers": total_workers,
            "avg_workers_per_day": avg_workers,
            "photo_count": photo_count,
            "inspection_count": len(inspections),
        },
        "weather": weather_counts,
        "progress": {
            "total_phases": total_phases,
            "completed_phases": completed,
            "progress_percent": round(completed / total_phases * 100) if total_phases > 0 else 0,
            "in_progress_phases": in_progress,
        },
        "inspections": [
            {"title": i.title, "date": i.scheduled_date.isoformat() if i.scheduled_date else None, "result": i.result, "status": i.status}
            for i in inspections
        ],
        "daily_details": work_descriptions,
        "report_text": _build_monthly_text(year, month, work_days, avg_workers, in_progress, photo_count, weather_counts),
    }


def _build_monthly_text(year, month, work_days, avg_workers, active_phases, photos, weather) -> str:
    """月報本文を自然言語で生成。"""
    lines = []
    lines.append(f"{year}年{month}月 月次工事報告")
    lines.append("")
    lines.append(f"当月の稼働日数は{work_days}日、平均作業員数は{avg_workers}名でした。")
    if active_phases:
        lines.append(f"現在進行中の工程は{'、'.join(active_phases[:5])}です。")
    lines.append(f"施工写真は{photos}枚を記録しました。")
    top_weather = max(weather.items(), key=lambda x: x[1])[0] if weather else "不明"
    lines.append(f"天候は「{top_weather}」が最多でした。")
    return "\n".join(lines)
