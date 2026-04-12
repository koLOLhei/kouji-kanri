"""AI安全スコア算出サービス — インシデント・KY実施率・天候等を総合評価。"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.safety import KYActivity, IncidentReport, SafetyPatrol
from models.weather import WeatherRecord
from models.worker import Attendance


def calculate_safety_score(project_id: str, db: Session) -> dict:
    """安全スコア (0〜100) を算出する。100が最安全。

    評価要素:
    - 直近30日のインシデント数と重要度分布 (最大-50点)
    - KY活動の実施率 (最大+20点)
    - 安全巡回の実施頻度 (最大+10点)
    - 天候リスク (最大-10点)
    - 作業員数による規模リスク (最大-10点)
    """
    today = datetime.now(timezone.utc).date()
    thirty_days_ago = today - timedelta(days=30)

    # ── インシデント評価 ──
    incidents = db.query(IncidentReport).filter(
        IncidentReport.project_id == project_id,
        IncidentReport.incident_date >= thirty_days_ago,
    ).all()

    severity_weights = {"minor": 5, "moderate": 10, "major": 20, "critical": 40}
    incident_penalty = 0
    severity_dist: dict[str, int] = {}
    for inc in incidents:
        w = severity_weights.get(inc.severity or "minor", 5)
        incident_penalty += w
        severity_dist[inc.severity or "minor"] = severity_dist.get(inc.severity or "minor", 0) + 1
    incident_penalty = min(incident_penalty, 50)

    # ── KY活動実施率評価 ──
    # 直近30日間の営業日数(22日として)に対する実施回数割合
    ky_count = db.query(func.count(KYActivity.id)).filter(
        KYActivity.project_id == project_id,
        KYActivity.activity_date >= thirty_days_ago,
    ).scalar() or 0
    ky_rate = min(ky_count / 22.0, 1.0)  # 22営業日で割合算出
    ky_bonus = round(ky_rate * 20)

    # ── 安全巡回評価 ──
    patrol_count = db.query(func.count(SafetyPatrol.id)).filter(
        SafetyPatrol.project_id == project_id,
        SafetyPatrol.patrol_date >= thirty_days_ago,
    ).scalar() or 0
    patrol_bonus = min(patrol_count * 2, 10)

    # ── 天候リスク ──
    weather_penalty = 0
    try:
        recent_weather = db.query(WeatherRecord).filter(
            WeatherRecord.project_id == project_id,
            WeatherRecord.record_date >= today - timedelta(days=7),
        ).all()
        bad_weather_days = sum(
            1 for w in recent_weather
            if (w.weather_09 or w.weather_06 or "") in ("雨", "大雨", "暴風雨", "雪", "嵐")
               or (w.weather_12 or w.weather_15 or "") in ("雨", "大雨", "暴風雨", "雪", "嵐")
               or (w.rainfall_mm or 0) >= 10
        )
        # 夏季（7月〜9月）は熱中症リスクで+ペナルティ
        month = today.month
        heat_penalty = 3 if month in (7, 8, 9) else 0
        # 冬季（12〜2月）は凍結リスク
        cold_penalty = 2 if month in (12, 1, 2) else 0
        weather_penalty = min(bad_weather_days * 2 + heat_penalty + cold_penalty, 10)
    except Exception:
        weather_penalty = 0

    # ── 作業員数リスク ──
    worker_risk = 0
    try:
        worker_count = db.query(func.count(func.distinct(Attendance.worker_id))).filter(
            Attendance.project_id == project_id,
            Attendance.work_date >= thirty_days_ago,
        ).scalar() or 0
        if worker_count > 50:
            worker_risk = 10
        elif worker_count > 20:
            worker_risk = 5
        elif worker_count > 10:
            worker_risk = 2
    except Exception:
        worker_risk = 0

    # ── スコア計算 ──
    base = 70  # ベーススコア
    score = base - incident_penalty + ky_bonus + patrol_bonus - weather_penalty - worker_risk
    score = max(0, min(100, score))

    # ── リスクレベル判定 ──
    if score >= 80:
        risk_level = "low"
    elif score >= 60:
        risk_level = "medium"
    elif score >= 40:
        risk_level = "high"
    else:
        risk_level = "critical"

    return {
        "score": score,
        "risk_level": risk_level,
        "factors": {
            "incident_penalty": incident_penalty,
            "ky_bonus": ky_bonus,
            "patrol_bonus": patrol_bonus,
            "weather_penalty": weather_penalty,
            "worker_risk": worker_risk,
        },
        "details": {
            "incident_count_30d": len(incidents),
            "severity_distribution": severity_dist,
            "ky_count_30d": ky_count,
            "ky_rate_percent": round(ky_rate * 100),
            "patrol_count_30d": patrol_count,
        },
    }


def predict_risk_7days(project_id: str, db: Session) -> list[dict]:
    """直近のデータパターンから今後7日間のリスク予測を行う。"""
    today = datetime.now(timezone.utc).date()
    base_result = calculate_safety_score(project_id, db)
    base_score = base_result["score"]

    forecasts = []
    for i in range(7):
        forecast_date = today + timedelta(days=i + 1)
        # 曜日リスク (月曜日・週初は疲労リセット後の慣れ不足)
        day_of_week = forecast_date.weekday()  # 0=月曜
        weekday_risk_map = {0: -3, 1: 0, 2: 2, 3: 2, 4: 0, 5: -2, 6: -4}
        weekday_adj = weekday_risk_map.get(day_of_week, 0)

        # 月末は支払い・書類等で多忙 → 注意散漫リスク
        month_end_risk = -3 if forecast_date.day >= 25 else 0

        daily_score = max(0, min(100, base_score + weekday_adj + month_end_risk))

        if daily_score >= 80:
            risk = "low"
        elif daily_score >= 60:
            risk = "medium"
        elif daily_score >= 40:
            risk = "high"
        else:
            risk = "critical"

        forecasts.append({
            "date": forecast_date.isoformat(),
            "day_of_week": ["月", "火", "水", "木", "金", "土", "日"][day_of_week],
            "predicted_score": daily_score,
            "risk_level": risk,
            "notes": _build_risk_notes(day_of_week, forecast_date, base_result),
        })

    return forecasts


def _build_risk_notes(day_of_week: int, d: date, base_result: dict) -> list[str]:
    notes = []
    if day_of_week == 0:
        notes.append("週明け: 注意力低下に注意")
    if d.day >= 25:
        notes.append("月末: 業務繁忙による注意散漫リスク")
    if d.month in (7, 8, 9):
        notes.append("夏季: 熱中症リスク")
    if d.month in (12, 1, 2):
        notes.append("冬季: 凍結・転倒リスク")
    if base_result["details"]["incident_count_30d"] >= 3:
        notes.append("インシデント多発中: 注意強化推奨")
    if base_result["details"]["ky_rate_percent"] < 50:
        notes.append("KY活動実施率低下: 実施を強化してください")
    return notes
