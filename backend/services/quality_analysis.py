"""出来形管理・品質管理の自動判定サービス

測定値から以下を自動計算:
- 規格値との照合・合否判定
- 平均値・標準偏差
- 工程能力指数 Cp, Cpk
- ヒストグラム用データ
- x̄-R管理図用データ
"""

import math
from sqlalchemy.orm import Session

from models.measurement import Measurement


def analyze_measurements(project_id: str, db: Session, measurement_type: str | None = None) -> dict:
    """プロジェクト内の全測定データを分析。"""
    q = db.query(Measurement).filter(Measurement.project_id == project_id)
    if measurement_type:
        q = q.filter(Measurement.measurement_type == measurement_type)
    measurements = q.order_by(Measurement.measured_date).all()

    if not measurements:
        return {"error": "測定データがありません", "count": 0}

    # 全個別測定値を抽出
    all_values = []
    all_items_flat = []
    pass_count = 0
    fail_count = 0

    for m in measurements:
        items = m.items or []
        for item in items:
            actual = item.get("actual_value")
            design = item.get("design_value")
            tolerance = item.get("tolerance")
            if actual is not None:
                all_values.append(float(actual))
                all_items_flat.append(item)
                # 合否判定
                if design is not None and tolerance is not None:
                    lower = float(design) - abs(float(tolerance))
                    upper = float(design) + abs(float(tolerance))
                    if lower <= float(actual) <= upper:
                        pass_count += 1
                    else:
                        fail_count += 1

    if not all_values:
        return {"error": "有効な測定値がありません", "count": 0}

    n = len(all_values)
    mean = sum(all_values) / n
    variance = sum((x - mean) ** 2 for x in all_values) / n if n > 1 else 0
    std_dev = math.sqrt(variance) if variance > 0 else 0

    # Cp/Cpk計算（規格値が設定されている場合）
    cp = None
    cpk = None
    usl = None  # 上限規格値
    lsl = None  # 下限規格値

    # 最初の測定から規格値を取得
    for item in all_items_flat:
        design = item.get("design_value")
        tolerance = item.get("tolerance")
        if design is not None and tolerance is not None:
            usl = float(design) + abs(float(tolerance))
            lsl = float(design) - abs(float(tolerance))
            break

    if usl is not None and lsl is not None and std_dev > 0:
        cp = (usl - lsl) / (6 * std_dev)
        cpu = (usl - mean) / (3 * std_dev)
        cpl = (mean - lsl) / (3 * std_dev)
        cpk = min(cpu, cpl)

    # 工程能力判定
    capability = "未算出"
    if cpk is not None:
        if cpk >= 1.67:
            capability = "十分（Cpk≧1.67）"
        elif cpk >= 1.33:
            capability = "適切（Cpk≧1.33）"
        elif cpk >= 1.0:
            capability = "やや不足（1.0≦Cpk<1.33）— 管理強化推奨"
        else:
            capability = "不足（Cpk<1.0）— 工程改善が必要"

    # ヒストグラム用データ（10区間）
    if n >= 2:
        min_val = min(all_values)
        max_val = max(all_values)
        bin_width = (max_val - min_val) / 10 if max_val > min_val else 1
        histogram = []
        for i in range(10):
            lower_bound = min_val + i * bin_width
            upper_bound = lower_bound + bin_width
            count = sum(1 for v in all_values if lower_bound <= v < upper_bound)
            if i == 9:  # 最後のbinは上限含む
                count = sum(1 for v in all_values if lower_bound <= v <= upper_bound)
            histogram.append({
                "bin_lower": round(lower_bound, 3),
                "bin_upper": round(upper_bound, 3),
                "count": count,
            })
    else:
        histogram = []

    # x̄-R管理図用データ（測定ごとにサブグループ）
    xbar_r_data = []
    for m in measurements:
        items = m.items or []
        values = [float(it["actual_value"]) for it in items if it.get("actual_value") is not None]
        if values:
            sub_mean = sum(values) / len(values)
            sub_range = max(values) - min(values) if len(values) > 1 else 0
            xbar_r_data.append({
                "date": m.measured_date.isoformat() if m.measured_date else None,
                "title": m.title,
                "x_bar": round(sub_mean, 3),
                "range": round(sub_range, 3),
                "n": len(values),
            })

    return {
        "project_id": project_id,
        "measurement_type": measurement_type,
        "total_measurements": len(measurements),
        "total_values": n,
        "statistics": {
            "mean": round(mean, 4),
            "std_dev": round(std_dev, 4),
            "min": round(min(all_values), 4),
            "max": round(max(all_values), 4),
        },
        "specification": {
            "usl": round(usl, 4) if usl is not None else None,
            "lsl": round(lsl, 4) if lsl is not None else None,
        },
        "process_capability": {
            "cp": round(cp, 3) if cp is not None else None,
            "cpk": round(cpk, 3) if cpk is not None else None,
            "capability_judgment": capability,
        },
        "pass_fail": {
            "pass": pass_count,
            "fail": fail_count,
            "pass_rate": round(pass_count / (pass_count + fail_count) * 100, 1) if (pass_count + fail_count) > 0 else 100,
        },
        "histogram": histogram,
        "xbar_r_chart": xbar_r_data,
    }


def auto_judge_measurement(measurement: Measurement) -> dict:
    """個別の出来形測定に対して自動合否判定を実行。"""
    items = measurement.items or []
    results = []
    overall = "pass"

    for item in items:
        actual = item.get("actual_value")
        design = item.get("design_value")
        tolerance = item.get("tolerance")
        name = item.get("name", "")

        if actual is None or design is None or tolerance is None:
            results.append({"name": name, "result": "データ不足", "judgment": "skip"})
            continue

        actual_f = float(actual)
        design_f = float(design)
        tol_f = abs(float(tolerance))
        lower = design_f - tol_f
        upper = design_f + tol_f
        diff = actual_f - design_f

        if lower <= actual_f <= upper:
            judgment = "pass"
        else:
            judgment = "fail"
            overall = "fail"

        results.append({
            "name": name,
            "design": design_f,
            "actual": actual_f,
            "tolerance": f"±{tol_f}",
            "lower_limit": lower,
            "upper_limit": upper,
            "difference": round(diff, 4),
            "judgment": judgment,
        })

    return {
        "measurement_id": measurement.id,
        "overall_result": overall,
        "items": results,
    }
