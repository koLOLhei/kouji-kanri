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


def generate_ky_draft(project_id: str, db: Session, target_date: date | None = None) -> dict:
    """現場データに基づいたKY活動（危険予知）の文章を自動生成。

    過去のインシデント、天候、工種、季節を分析し、
    その現場特有の危険予知シートの下書きを作成する。
    """
    if target_date is None:
        target_date = datetime.now(timezone.utc).date()

    # データ収集
    score_data = calculate_safety_score(project_id, db)
    recent_incidents = db.query(IncidentReport).filter(
        IncidentReport.project_id == project_id,
        IncidentReport.incident_date >= target_date - timedelta(days=90),
    ).order_by(IncidentReport.incident_date.desc()).limit(10).all()

    weather = db.query(WeatherRecord).filter(
        WeatherRecord.project_id == project_id,
        WeatherRecord.record_date == target_date,
    ).first()

    from models.phase import Phase
    active_phases = db.query(Phase).filter(
        Phase.project_id == project_id,
        Phase.status == "in_progress",
    ).all()
    work_types = [p.name for p in active_phases]

    # 危険要因を現場データから抽出
    hazards = []
    countermeasures = []

    # 季節リスク
    month = target_date.month
    if month in (6, 7, 8, 9):
        hazards.append("高温による熱中症")
        countermeasures.append("こまめな水分補給と休憩の確保。WBGT値の確認。")
    if month in (12, 1, 2):
        hazards.append("路面凍結・霜による転倒")
        countermeasures.append("朝礼時に足元の確認を徹底。滑り止め処置の実施。")
    if month in (6, 7, 9, 10):
        hazards.append("降雨による足場の滑り")
        countermeasures.append("足場上の作業前に滑り止めを確認。雨天時の高所作業は中止判断。")

    # 天候リスク
    if weather:
        w = (weather.weather_morning or "").lower()
        if "雨" in w or "rain" in w:
            if "降雨による足場の滑り" not in hazards:
                hazards.append("降雨による足場の滑り・視界不良")
                countermeasures.append("足場上の水たまり除去。雨具着用による視界制限に注意。")
        if "風" in w or "wind" in w:
            hazards.append("強風による資材飛散・高所作業の危険")
            countermeasures.append("風速10m/s以上で高所作業中止。資材の固定確認。")

    # 工種別リスク
    for wt in work_types:
        if "塗装" in wt:
            hazards.append(f"{wt}: 有機溶剤による中毒・火災")
            countermeasures.append("防毒マスク着用。火気厳禁の確認。換気の徹底。")
        if "足場" in wt or "仮設" in wt:
            hazards.append(f"{wt}: 足場からの墜落")
            countermeasures.append("安全帯（フルハーネス）の確実な使用。昇降時の三点支持。")
        if "防水" in wt:
            hazards.append(f"{wt}: トーチ工法による火傷・火災")
            countermeasures.append("消火器の配置確認。作業後の火気確認巡回。")
        if "解体" in wt or "撤去" in wt:
            hazards.append(f"{wt}: 飛散物による怪我")
            countermeasures.append("立入禁止区域の設定。保護メガネ着用。")

    # 過去インシデントからの学び
    for inc in recent_incidents[:3]:
        hazards.append(f"過去事例: {inc.title or '不明'} ({inc.incident_date.isoformat()})")
        if inc.corrective_action:
            countermeasures.append(f"再発防止: {inc.corrective_action[:80]}")

    # デフォルト（何もない場合）
    if not hazards:
        hazards.append("つまずき・転倒（整理整頓の不備）")
        countermeasures.append("通路上の資材・工具を整理。歩行経路を確保。")

    return {
        "date": target_date.isoformat(),
        "project_id": project_id,
        "work_types": work_types,
        "safety_score": score_data["score"],
        "risk_level": score_data["risk_level"],
        "hazards": hazards,
        "countermeasures": countermeasures,
        "weather": {
            "morning": weather.weather_morning if weather else None,
            "afternoon": weather.weather_afternoon if weather else None,
        },
        "ky_sheet_draft": {
            "theme": f"本日の作業: {'・'.join(work_types) or '一般作業'}",
            "danger_items": [{"hazard": h, "countermeasure": c} for h, c in zip(hazards, countermeasures)],
            "team_goal": _build_team_goal(score_data["risk_level"], work_types, target_date),
        },
        "morning_script": _build_morning_script(target_date, work_types, hazards, countermeasures, weather, score_data, recent_incidents),
        "generated_by": "KAMO Safety AI",
    }


def _build_team_goal(risk_level: str, work_types: list[str], target_date: date) -> str:
    """チーム目標の自然言語生成。"""
    dow = ["月", "火", "水", "木", "金", "土", "日"][target_date.weekday()]
    work_str = "・".join(work_types[:2]) if work_types else "現場作業"

    if risk_level == "critical":
        return f"本日（{dow}曜日）はリスクが高い状況です。{work_str}作業中は特に声掛けを徹底し、少しでも異変を感じたら即座に作業を中断してください。"
    if risk_level == "high":
        return f"本日（{dow}曜日）は注意が必要な日です。{work_str}の作業開始前に、全員で危険箇所の指差し確認を行いましょう。"
    if risk_level == "medium":
        return f"本日（{dow}曜日）の{work_str}作業を安全に進めましょう。基本動作の確認を忘れずに。ゼロ災でいこう、ヨシ！"
    return f"本日（{dow}曜日）の安全スコアは良好です。この調子で{work_str}作業を丁寧に進めましょう。ゼロ災でいこう、ヨシ！"


def _build_morning_script(target_date: date, work_types: list, hazards: list, countermeasures: list, weather, score_data: dict, incidents: list) -> str:
    """朝礼で読み上げ可能なKY活動スクリプトを自然言語で生成。"""
    dow = ["月", "火", "水", "木", "金", "土", "日"][target_date.weekday()]
    date_str = f"{target_date.month}月{target_date.day}日（{dow}）"
    weather_str = ""
    if weather:
        weather_str = f"本日の天気は午前「{weather.weather_morning or '不明'}」、午後「{weather.weather_afternoon or '不明'}」の予報です。"

    lines = []
    lines.append(f"おはようございます。{date_str}の朝礼を始めます。")
    if weather_str:
        lines.append(weather_str)
    lines.append("")

    # 本日の作業内容
    if work_types:
        lines.append(f"本日の主な作業内容は{'、'.join(work_types)}です。")
    else:
        lines.append("本日も引き続き現場作業を進めます。")
    lines.append("")

    # KY 4ラウンド法
    lines.append("【第1ラウンド: どんな危険が潜んでいるか】")
    for i, h in enumerate(hazards[:5], 1):
        lines.append(f"  {i}. {h}")
    lines.append("")

    lines.append("【第2ラウンド: これが危険のポイントだ】")
    # 最も重要な危険を選出
    priority_idx = 0
    for i, h in enumerate(hazards[:5]):
        if "墜落" in h or "転倒" in h or "中毒" in h or "火災" in h:
            priority_idx = i
            break
    lines.append(f"  → 本日最も注意すべき危険は「{hazards[priority_idx]}」です。")
    lines.append("")

    lines.append("【第3ラウンド: あなたならどうする】")
    for i, c in enumerate(countermeasures[:5], 1):
        lines.append(f"  {i}. {c}")
    lines.append("")

    lines.append("【第4ラウンド: 私たちはこうする】")
    if countermeasures:
        lines.append(f"  チーム行動目標: 「{countermeasures[0]}」を全員が実行します。")
    lines.append("")

    # 過去インシデント注意喚起
    if incidents:
        lines.append("【過去の事故事例からの注意喚起】")
        for inc in incidents[:2]:
            lines.append(f"  ・{inc.incident_date.strftime('%m/%d')} {inc.title or '不明'}")
            if inc.corrective_action:
                lines.append(f"    → 再発防止策: {inc.corrective_action[:60]}")
        lines.append("")

    # 安全スコア
    risk_label = {"low": "良好", "medium": "注意", "high": "警戒", "critical": "危険"}
    lines.append(f"本日の安全スコアは{score_data['score']}点（{risk_label.get(score_data['risk_level'], '不明')}）です。")
    lines.append("")

    # 締め
    lines.append("それでは本日も安全第一で作業を進めましょう。")
    lines.append("ゼロ災でいこう、ヨシ！")

    return "\n".join(lines)


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
