"""Redisキャッシュサービス — セッション安定化 + レート制限。

REDIS_URL環境変数が設定されていればRedisを使用。
未設定の場合はインメモリにフォールバック（既存動作を維持）。
"""

import os
import json
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

_redis_client = None
_use_redis = False


def _init_redis():
    """Redis接続を初期化。起動時に1回だけ呼ぶ。"""
    global _redis_client, _use_redis
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.info("[cache] REDIS_URL not set, using in-memory cache")
        return

    try:
        import redis
        _redis_client = redis.from_url(redis_url, decode_responses=True, socket_timeout=3)
        _redis_client.ping()
        _use_redis = True
        logger.info("[cache] Redis connected")
    except Exception as e:
        logger.warning(f"[cache] Redis connection failed, falling back to in-memory: {e}")
        _redis_client = None
        _use_redis = False


# 初期化
_init_redis()

# ─── インメモリフォールバック ───
_mem_cache: dict[str, dict] = {}


def cache_get(key: str) -> str | None:
    """キャッシュから値を取得。"""
    if _use_redis and _redis_client:
        try:
            return _redis_client.get(key)
        except Exception:
            pass
    return _mem_cache.get(key, {}).get("value")


def cache_set(key: str, value: str, ttl_seconds: int = 300):
    """キャッシュに値を保存。"""
    if _use_redis and _redis_client:
        try:
            _redis_client.setex(key, ttl_seconds, value)
            return
        except Exception:
            pass
    import time
    _mem_cache[key] = {"value": value, "expires": time.time() + ttl_seconds}


def cache_delete(key: str):
    """キャッシュから削除。"""
    if _use_redis and _redis_client:
        try:
            _redis_client.delete(key)
            return
        except Exception:
            pass
    _mem_cache.pop(key, None)


def cache_incr(key: str, ttl_seconds: int = 60) -> int:
    """カウンターをインクリメント。レート制限用。"""
    if _use_redis and _redis_client:
        try:
            pipe = _redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, ttl_seconds)
            results = pipe.execute()
            return results[0]
        except Exception:
            pass
    # インメモリフォールバック
    import time
    now = time.time()
    entry = _mem_cache.get(key, {})
    if entry.get("expires", 0) < now:
        _mem_cache[key] = {"value": "1", "expires": now + ttl_seconds}
        return 1
    count = int(entry.get("value", "0")) + 1
    _mem_cache[key] = {"value": str(count), "expires": entry["expires"]}
    return count


# ─── token_version キャッシュ（セッション安定化） ───

def get_cached_token_version(user_id: str) -> int | None:
    """ユーザーのtoken_versionをキャッシュから取得。DB負荷軽減。"""
    val = cache_get(f"token_version:{user_id}")
    if val is not None:
        return int(val)
    return None


def set_cached_token_version(user_id: str, version: int):
    """token_versionをキャッシュに保存。TTL=10分。"""
    cache_set(f"token_version:{user_id}", str(version), ttl_seconds=600)


def invalidate_token_version(user_id: str):
    """token_versionキャッシュを無効化（パスワード変更・ログアウト時）。"""
    cache_delete(f"token_version:{user_id}")
