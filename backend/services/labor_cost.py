"""勤怠→原価自動計算サービス — 出勤データから労務費を自動集計。"""

from datetime import date
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from models.worker import Attendance, Worker


# デフォルト日当（設定で上書き可能）
DEFAULT_DAILY_RATE = 15000  # 一般作業員
DAILY_RATES = {
    "職長": 20000,
    "一級塗装技能士": 22000,
    "重機オペレーター": 25000,
    "一般": 15000,
}


def calculate_labor_cost(project_id: str, year: int, month: int, db: Session) -> dict:
    """指定月の勤怠データから労務費を自動計算。"""

    attendances = db.query(Attendance).filter(
        Attendance.project_id == project_id,
        extract('year', Attendance.work_date) == year,
        extract('month', Attendance.work_date) == month,
    ).all()

    if not attendances:
        return {"year": year, "month": month, "total_cost": 0, "total_days": 0, "workers": []}

    # 作業員別に集計
    worker_summary = {}
    for att in attendances:
        wid = att.worker_id
        if wid not in worker_summary:
            worker = db.query(Worker).filter(Worker.id == wid).first()
            worker_name = worker.name if worker else "不明"
            # 日当の決定: worker.daily_rateがあればそれを使う、なければデフォルト
            daily_rate = getattr(worker, 'daily_rate', None) or DEFAULT_DAILY_RATE
            worker_summary[wid] = {
                "worker_id": wid,
                "worker_name": worker_name,
                "daily_rate": daily_rate,
                "days": 0,
                "cost": 0,
            }
        worker_summary[wid]["days"] += 1
        worker_summary[wid]["cost"] = worker_summary[wid]["days"] * worker_summary[wid]["daily_rate"]

    workers = sorted(worker_summary.values(), key=lambda w: w["cost"], reverse=True)
    total_cost = sum(w["cost"] for w in workers)
    total_days = sum(w["days"] for w in workers)

    return {
        "year": year,
        "month": month,
        "project_id": project_id,
        "total_cost": total_cost,
        "total_days": total_days,
        "total_workers": len(workers),
        "avg_daily_cost": round(total_cost / total_days) if total_days > 0 else 0,
        "workers": workers,
    }
