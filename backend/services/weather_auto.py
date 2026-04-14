"""天気自動取得サービス — 気象庁データから当日の天気を取得。

外部APIキー不要。気象庁の公開JSONを使用。
"""

import json
from urllib.request import Request, urlopen
from urllib.error import URLError
import logging

logger = logging.getLogger(__name__)

# 気象庁の地域コード: 川崎市 → 神奈川県東部 (140010)
AREA_CODES = {
    "神奈川県東部": "140010",  # 横浜・川崎
    "東京都": "130010",        # 東京23区
}

JMA_URL = "https://www.jma.go.jp/bosai/forecast/data/forecast/{area_code}.json"


def fetch_today_weather(area: str = "神奈川県東部") -> dict | None:
    """気象庁APIから今日の天気を取得。

    Returns: {"morning": "晴れ", "afternoon": "曇り", "max_temp": 25, "min_temp": 15} or None
    """
    area_code = AREA_CODES.get(area)
    if not area_code:
        return None

    try:
        url = JMA_URL.format(area_code=area_code)
        req = Request(url, headers={"User-Agent": "kouji-kanri/1.0"})
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        # 最新の天気情報を抽出
        if not data or len(data) == 0:
            return None

        forecast = data[0]
        time_series = forecast.get("timeSeries", [])
        if not time_series:
            return None

        # 天気テキスト
        weather_text = None
        for ts in time_series:
            areas = ts.get("areas", [])
            if areas:
                weathers = areas[0].get("weathers", [])
                if weathers:
                    weather_text = weathers[0]
                    break

        # 気温（別のtimeSeriesにある場合）
        max_temp = None
        min_temp = None
        for ts in time_series:
            areas = ts.get("areas", [])
            if areas:
                temps_max = areas[0].get("tempsMax", [])
                temps_min = areas[0].get("tempsMin", [])
                if temps_max:
                    try:
                        max_temp = int(temps_max[0])
                    except (ValueError, IndexError):
                        pass
                if temps_min:
                    try:
                        min_temp = int(temps_min[0])
                    except (ValueError, IndexError):
                        pass

        if not weather_text:
            return None

        # 午前/午後を推定（「のち」で分割）
        parts = weather_text.split("　のち　") if "　のち　" in weather_text else weather_text.split("のち")
        morning = parts[0].strip() if parts else weather_text
        afternoon = parts[1].strip() if len(parts) > 1 else morning

        return {
            "weather_text": weather_text,
            "morning": morning,
            "afternoon": afternoon,
            "max_temp": max_temp,
            "min_temp": min_temp,
            "source": "気象庁",
        }

    except (URLError, json.JSONDecodeError, KeyError, IndexError) as e:
        logger.warning(f"[weather] Failed to fetch: {e}")
        return None
