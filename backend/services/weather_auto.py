"""天気自動取得サービス — 気象庁データから当日の天気を取得。

外部APIキー不要。気象庁の公開JSONを使用。
30分間のメモリキャッシュ + 失敗時のフォールバック付き。
"""

import json
import time
import logging
from urllib.request import Request, urlopen
from urllib.error import URLError

logger = logging.getLogger(__name__)

# 気象庁の地域コード
AREA_CODES = {
    "神奈川県": "140000",
    "神奈川県東部": "140000",
    "東京都": "130000",
    "大阪府": "270000",
    "愛知県": "230000",
    "北海道（札幌）": "016000",
    "福岡県": "400000",
    "宮城県": "040000",
    "広島県": "340000",
    "京都府": "260000",
    "兵庫県": "280000",
}

JMA_OVERVIEW_URL = "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/{area_code}.json"

# キャッシュ: {area: (timestamp, payload)}
_CACHE: dict[str, tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 30 * 60  # 30 分


def _cached(area: str) -> dict | None:
    entry = _CACHE.get(area)
    if not entry:
        return None
    ts, payload = entry
    if time.time() - ts > _CACHE_TTL_SECONDS:
        return None
    return payload


def _store_cache(area: str, payload: dict) -> None:
    _CACHE[area] = (time.time(), payload)


def fetch_today_weather(area: str = "神奈川県") -> dict | None:
    """気象庁APIから今日の天気概況を取得。

    Returns: {"morning": "曇り", "afternoon": "晴れ", "weather_text": "...", "area": "...", "source": "気象庁"}
             失敗時は最後に取れた値（古くてもキャッシュあれば）、それも無ければ None。
    """
    area_code = AREA_CODES.get(area)
    if not area_code:
        # 未対応エリアは「神奈川県」にフォールバック
        area_code = AREA_CODES["神奈川県"]
        area = "神奈川県"

    # 30 分以内のキャッシュがあればそれを返す
    cached = _cached(area)
    if cached:
        return cached

    try:
        url = JMA_OVERVIEW_URL.format(area_code=area_code)
        req = Request(url, headers={"User-Agent": "kouji-kanri/1.0"})
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        text = data.get("text", "")
        target_area = data.get("targetArea", area)

        if not text:
            return _stale_or_default(area)

        morning = _extract_weather_keyword(text)
        afternoon = morning

        if "のち" in text:
            parts = text.split("のち")
            if len(parts) >= 2:
                morning = _extract_weather_keyword(parts[0])
                afternoon = _extract_weather_keyword(parts[1])

        result = {
            "weather_text": text[:200],
            "morning": morning,
            "afternoon": afternoon,
            "area": target_area,
            "source": "気象庁",
        }
        _store_cache(area, result)
        return result

    except (URLError, json.JSONDecodeError, KeyError, IndexError) as e:
        logger.warning(f"[weather] Failed to fetch: {e}")
        # 取得失敗時は古くてもキャッシュを返す（職人体験を止めない）
        return _stale_or_default(area)


def _stale_or_default(area: str) -> dict | None:
    """キャッシュがあれば古くても返す。無ければ「不明」を返す。"""
    entry = _CACHE.get(area)
    if entry:
        _, payload = entry
        return {**payload, "source": payload.get("source", "気象庁") + "(キャッシュ)"}
    return {
        "weather_text": "天気情報を取得できませんでした",
        "morning": "不明",
        "afternoon": "不明",
        "area": area,
        "source": "fallback",
    }


def _extract_weather_keyword(text: str) -> str:
    """テキストから天気キーワード（晴れ/曇り/雨等）を抽出。"""
    keywords = ["晴れ", "曇り", "雨", "雪", "霧"]
    for kw in keywords:
        if kw in text:
            return kw
    return "不明"
