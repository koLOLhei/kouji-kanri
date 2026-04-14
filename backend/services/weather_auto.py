"""天気自動取得サービス — 気象庁データから当日の天気を取得。

外部APIキー不要。気象庁の公開JSONを使用。
"""

import json
from urllib.request import Request, urlopen
from urllib.error import URLError
import logging

logger = logging.getLogger(__name__)

# 気象庁の地域コード
AREA_CODES = {
    "神奈川県": "140000",
    "東京都": "130000",
}

JMA_OVERVIEW_URL = "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/{area_code}.json"


def fetch_today_weather(area: str = "神奈川県") -> dict | None:
    """気象庁APIから今日の天気概況を取得。

    Returns: {"morning": "曇り", "afternoon": "晴れ", "text": "..."} or None
    """
    area_code = AREA_CODES.get(area)
    if not area_code:
        return None

    try:
        url = JMA_OVERVIEW_URL.format(area_code=area_code)
        req = Request(url, headers={"User-Agent": "kouji-kanri/1.0"})
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        text = data.get("text", "")
        target_area = data.get("targetArea", area)

        if not text:
            return None

        # テキストから天気キーワードを抽出
        morning = _extract_weather_keyword(text)
        afternoon = morning  # 概況なので同じ

        # 「のち」があれば午後を分離
        if "のち" in text:
            parts = text.split("のち")
            if len(parts) >= 2:
                morning = _extract_weather_keyword(parts[0])
                afternoon = _extract_weather_keyword(parts[1])

        return {
            "weather_text": text[:200],
            "morning": morning,
            "afternoon": afternoon,
            "area": target_area,
            "source": "気象庁",
        }

    except (URLError, json.JSONDecodeError, KeyError, IndexError) as e:
        logger.warning(f"[weather] Failed to fetch: {e}")
        return None


def _extract_weather_keyword(text: str) -> str:
    """テキストから天気キーワード（晴れ/曇り/雨等）を抽出。"""
    keywords = ["晴れ", "曇り", "雨", "雪", "霧"]
    for kw in keywords:
        if kw in text:
            return kw
    return "不明"
