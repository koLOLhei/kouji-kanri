"""品質管理統計処理サービス (Statistical processing for quality control)."""

import math
from typing import Optional


# ---------- Control chart constants ----------

# A2 factors for x̄ chart control limits
_A2 = {2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483}

# D3 factors for R chart lower control limit
_D3 = {2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0, 6: 0.0}

# D4 factors for R chart upper control limit
_D4 = {2: 3.267, 3: 2.575, 4: 2.282, 5: 2.115, 6: 2.004}


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _std_dev(values: list[float]) -> float:
    """Population standard deviation."""
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    variance = sum((v - m) ** 2 for v in values) / len(values)
    return math.sqrt(variance)


# ---------- x̄-R chart ----------

def calculate_xbar_r_chart(measurements: list[float], subgroup_size: int = 5) -> dict:
    """x̄-R管理図データ計算

    Parameters
    ----------
    measurements:
        Ordered list of individual measured values.
    subgroup_size:
        Number of measurements per subgroup (2–6).

    Returns
    -------
    dict with subgroups, control lines, and out-of-control flags.
    """
    n = subgroup_size
    if n not in _A2:
        raise ValueError(f"subgroup_size must be one of {list(_A2.keys())}, got {n}")
    if not measurements:
        return {
            "subgroups": [],
            "x_bar_values": [],
            "r_values": [],
            "x_bar_bar": 0.0,
            "r_bar": 0.0,
            "x_bar_ucl": 0.0,
            "x_bar_lcl": 0.0,
            "r_ucl": 0.0,
            "r_lcl": 0.0,
            "is_in_control": True,
            "num_subgroups": 0,
            "total_measurements": 0,
        }

    # Build subgroups (drop incomplete trailing subgroup)
    num_complete = len(measurements) // n
    subgroups: list[list[float]] = [
        measurements[i * n: (i + 1) * n] for i in range(num_complete)
    ]

    x_bar_values = [_mean(sg) for sg in subgroups]
    r_values = [max(sg) - min(sg) for sg in subgroups]

    x_bar_bar = _mean(x_bar_values) if x_bar_values else 0.0
    r_bar = _mean(r_values) if r_values else 0.0

    a2 = _A2[n]
    d3 = _D3[n]
    d4 = _D4[n]

    x_bar_ucl = x_bar_bar + a2 * r_bar
    x_bar_lcl = x_bar_bar - a2 * r_bar
    r_ucl = d4 * r_bar
    r_lcl = d3 * r_bar

    # Check if process is in control (all points within limits)
    x_bar_in_control = all(x_bar_lcl <= xb <= x_bar_ucl for xb in x_bar_values)
    r_in_control = all(r_lcl <= r <= r_ucl for r in r_values)
    is_in_control = x_bar_in_control and r_in_control

    subgroup_details = [
        {
            "subgroup_index": i + 1,
            "values": subgroups[i],
            "x_bar": x_bar_values[i],
            "r": r_values[i],
            "x_bar_out_of_control": not (x_bar_lcl <= x_bar_values[i] <= x_bar_ucl),
            "r_out_of_control": not (r_lcl <= r_values[i] <= r_ucl),
        }
        for i in range(num_complete)
    ]

    return {
        "subgroups": subgroup_details,
        "x_bar_values": x_bar_values,
        "r_values": r_values,
        "x_bar_bar": x_bar_bar,
        "r_bar": r_bar,
        "x_bar_ucl": x_bar_ucl,
        "x_bar_lcl": x_bar_lcl,
        "r_ucl": r_ucl,
        "r_lcl": r_lcl,
        "is_in_control": is_in_control,
        "num_subgroups": num_complete,
        "total_measurements": len(measurements),
        "subgroup_size": n,
    }


# ---------- Histogram ----------

def calculate_histogram(
    measurements: list[float],
    num_bins: int = 10,
    upper_limit: Optional[float] = None,
    lower_limit: Optional[float] = None,
) -> dict:
    """ヒストグラム・度数分布表計算

    Parameters
    ----------
    measurements:
        Raw measured values.
    num_bins:
        Number of histogram bins.
    upper_limit:
        Spec upper limit (USL) – used to calculate Cp/Cpk.
    lower_limit:
        Spec lower limit (LSL) – used to calculate Cp/Cpk.
    """
    if not measurements:
        return {
            "bins": [],
            "frequencies": [],
            "cumulative_frequencies": [],
            "relative_frequencies": [],
            "mean": 0.0,
            "std_dev": 0.0,
            "min": 0.0,
            "max": 0.0,
            "cp": None,
            "cpk": None,
            "n": 0,
        }

    mn = min(measurements)
    mx = max(measurements)
    mean = _mean(measurements)
    std = _std_dev(measurements)

    # Build bins
    if mx == mn:
        # All values are identical – create a single bin
        bin_width = 1.0
    else:
        bin_width = (mx - mn) / num_bins

    # Extend slightly to include the max value in the last bin
    bins: list[dict] = []
    for i in range(num_bins):
        low = mn + i * bin_width
        high = mn + (i + 1) * bin_width
        bins.append({"lower": low, "upper": high, "mid": (low + high) / 2})

    frequencies = [0] * num_bins
    for v in measurements:
        if v == mx:
            # Put the max into the last bin
            idx = num_bins - 1
        else:
            idx = int((v - mn) / bin_width)
            idx = max(0, min(idx, num_bins - 1))
        frequencies[idx] += 1

    cumulative = []
    running = 0
    for f in frequencies:
        running += f
        cumulative.append(running)

    n = len(measurements)
    relative_frequencies = [f / n for f in frequencies]

    # Process capability indices (require std > 0 and both limits provided)
    cp: Optional[float] = None
    cpk: Optional[float] = None
    if std > 0 and upper_limit is not None and lower_limit is not None:
        cp = (upper_limit - lower_limit) / (6 * std)
        cpu = (upper_limit - mean) / (3 * std)
        cpl = (mean - lower_limit) / (3 * std)
        cpk = min(cpu, cpl)

    return {
        "bins": [
            {**b, "frequency": frequencies[i], "relative_frequency": relative_frequencies[i]}
            for i, b in enumerate(bins)
        ],
        "frequencies": frequencies,
        "cumulative_frequencies": cumulative,
        "relative_frequencies": relative_frequencies,
        "mean": mean,
        "std_dev": std,
        "min": mn,
        "max": mx,
        "cp": cp,
        "cpk": cpk,
        "n": n,
    }


# ---------- As-built management chart ----------

def calculate_as_built_management(
    measurements: list[dict],
    design_value: float,
    upper_limit: float,
    lower_limit: float,
) -> dict:
    """出来形管理図データ計算

    Parameters
    ----------
    measurements:
        List of dicts with at least ``{"location": str, "value": float}``.
        Additional keys (e.g. ``lot_number``, ``measured_at``) are forwarded.
    design_value:
        Design (nominal) value.
    upper_limit:
        Specification upper limit.
    lower_limit:
        Specification lower limit.
    """
    if not measurements:
        return {
            "measurements": [],
            "design_value": design_value,
            "upper_limit": upper_limit,
            "lower_limit": lower_limit,
            "mean": 0.0,
            "std_dev": 0.0,
            "within_spec_rate": 0.0,
            "is_compliant": True,
            "chart_data": [],
        }

    values = [float(m["value"]) for m in measurements]
    mean = _mean(values)
    std = _std_dev(values)

    chart_data = []
    for m in measurements:
        v = float(m["value"])
        is_pass = lower_limit <= v <= upper_limit
        entry = {
            "location": m.get("location", ""),
            "value": v,
            "is_pass": is_pass,
        }
        # Forward optional metadata
        for key in ("lot_number", "sample_number", "measured_at", "measured_by"):
            if key in m:
                entry[key] = m[key]
        chart_data.append(entry)

    passed = sum(1 for c in chart_data if c["is_pass"])
    within_spec_rate = passed / len(chart_data)
    is_compliant = within_spec_rate == 1.0

    return {
        "measurements": measurements,
        "design_value": design_value,
        "upper_limit": upper_limit,
        "lower_limit": lower_limit,
        "mean": mean,
        "std_dev": std,
        "within_spec_rate": within_spec_rate,
        "is_compliant": is_compliant,
        "chart_data": chart_data,
        "n": len(values),
        "passed": passed,
        "failed": len(chart_data) - passed,
    }
