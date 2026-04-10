"""In-memory rate limiter middleware (per IP and per tenant).

Limits:
  - API endpoints:    100 requests / minute  (per IP)
  - File uploads:      10 uploads / minute    (per IP)
  - Per-tenant API:   300 requests / minute  (per tenant_id, decoded from JWT)
"""

import time
import threading
from collections import defaultdict

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_RATE_LIMIT = 500        # requests per window (dev: 500, prod: 100)
UPLOAD_RATE_LIMIT = 10      # requests per window
TENANT_RATE_LIMIT = 300     # requests per window per tenant
WINDOW_SECONDS = 60         # sliding-window size in seconds

# URL path prefixes that count as "file upload" endpoints
UPLOAD_PREFIXES = ("/api/photos", "/api/files")


# ---------------------------------------------------------------------------
# Sliding-window counter
# ---------------------------------------------------------------------------

class _SlidingWindowCounter:
    """Thread-safe per-key sliding window request counter."""

    def __init__(self, window_seconds: int):
        self._window = window_seconds
        self._lock = threading.Lock()
        # key -> list[float]  (timestamps of requests in the current window)
        self._data: dict[str, list[float]] = defaultdict(list)

    def _evict(self, key: str, now: float):
        cutoff = now - self._window
        self._data[key] = [t for t in self._data[key] if t > cutoff]

    def increment(self, key: str) -> int:
        """Record a request for key and return the current count within the window."""
        now = time.monotonic()
        with self._lock:
            self._evict(key, now)
            self._data[key].append(now)
            return len(self._data[key])

    def count(self, key: str) -> int:
        now = time.monotonic()
        with self._lock:
            self._evict(key, now)
            return len(self._data[key])


# Global counters (shared across all requests in the process)
_ip_api_counter = _SlidingWindowCounter(WINDOW_SECONDS)
_ip_upload_counter = _SlidingWindowCounter(WINDOW_SECONDS)
_tenant_counter = _SlidingWindowCounter(WINDOW_SECONDS)


# ---------------------------------------------------------------------------
# Helper: extract tenant_id from JWT without full verification
# (We only need it for rate-limit bucketing, not for auth.)
# ---------------------------------------------------------------------------

def _get_tenant_id_from_request(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[len("Bearer "):]
    try:
        import base64
        import json
        # JWT = header.payload.signature  – decode payload (no verification needed here)
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # Add padding
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get("tenant_id")
    except Exception:
        return None


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply rate limiting on all /api/* routes."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Only apply to API routes
        if not path.startswith("/api/"):
            return await call_next(request)

        ip = _client_ip(request)
        is_upload = any(path.startswith(p) for p in UPLOAD_PREFIXES) and request.method in ("POST", "PUT", "PATCH")

        # --- Per-IP upload limit ---
        if is_upload:
            count = _ip_upload_counter.increment(f"{ip}")
            if count > UPLOAD_RATE_LIMIT:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"アップロード上限を超えました。{UPLOAD_RATE_LIMIT}件/{WINDOW_SECONDS}秒 まで。",
                        "retry_after": WINDOW_SECONDS,
                    },
                    headers={"Retry-After": str(WINDOW_SECONDS)},
                )

        # --- Per-IP API limit ---
        api_count = _ip_api_counter.increment(ip)
        if api_count > API_RATE_LIMIT:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"リクエスト上限を超えました。{API_RATE_LIMIT}件/{WINDOW_SECONDS}秒 まで。",
                    "retry_after": WINDOW_SECONDS,
                },
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )

        # --- Per-tenant API limit ---
        tenant_id = _get_tenant_id_from_request(request)
        if tenant_id:
            t_count = _tenant_counter.increment(tenant_id)
            if t_count > TENANT_RATE_LIMIT:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"テナントのリクエスト上限を超えました。{TENANT_RATE_LIMIT}件/{WINDOW_SECONDS}秒 まで。",
                        "retry_after": WINDOW_SECONDS,
                    },
                    headers={"Retry-After": str(WINDOW_SECONDS)},
                )

        response = await call_next(request)

        # Expose rate-limit headers
        response.headers["X-RateLimit-Limit"] = str(API_RATE_LIMIT)
        response.headers["X-RateLimit-Remaining"] = str(max(0, API_RATE_LIMIT - api_count))
        response.headers["X-RateLimit-Window"] = str(WINDOW_SECONDS)

        return response
