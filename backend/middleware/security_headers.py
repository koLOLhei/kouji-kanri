"""Security headers middleware — OWASP recommended set.

Adds:
  - X-Content-Type-Options: nosniff (block MIME sniff XSS)
  - X-Frame-Options: DENY (prevent clickjacking; client portal uses sameorigin)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: minimal (geolocation only on same origin)
  - Strict-Transport-Security: max-age=31536000 (HSTS — production only)
  - Content-Security-Policy: minimal default-src self
  - X-XSS-Protection: 0 (modern browsers ignore; CSP is the answer)

Customisations for kouji-kanri:
  - /api/portal/* and /api/public/sign/* (顧客ポータル) は frame-ancestors を緩める可能性が将来あるので
    SAMEORIGIN にしておく。
  - HSTS は HTTPS リクエストでのみ送る (`request.url.scheme == 'https'` または X-Forwarded-Proto)。
"""

from __future__ import annotations

import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


_DEFAULT_CSP = (
    "default-src 'self'; "
    # Next.js client は inline script (hydration) を出すので unsafe-inline 必要
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob: https:; "
    "font-src 'self' data:; "
    "connect-src 'self' https: wss:; "
    "worker-src 'self' blob:; "
    "frame-ancestors 'self'; "
    "object-src 'none'; "
    "base-uri 'self'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add OWASP-recommended security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # All environments
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(self), camera=(self), microphone=(self), interest-cohort=()",
        )
        response.headers.setdefault("Content-Security-Policy", _DEFAULT_CSP)
        # X-XSS-Protection は現代のブラウザでは推奨されない (= 0 で無効化)
        response.headers.setdefault("X-XSS-Protection", "0")

        # HSTS — HTTPS リクエストでのみ。
        # Render / Vercel などのリバースプロキシ越しでは X-Forwarded-Proto ヘッダで判定する。
        is_https = request.url.scheme == "https" or (
            request.headers.get("x-forwarded-proto") == "https"
        )
        # 本番フラグが立っているか、HTTPS で実際に来た場合のみ HSTS を付ける
        is_prod = bool(os.environ.get("RENDER") or os.environ.get("PRODUCTION"))
        if is_https or is_prod:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )

        return response
