"""Full sweep: every endpoint (GET/POST/PUT/DELETE) must reject unauthenticated requests.

This test discovers all routes via the running app and verifies that:
  - GET/POST/PUT/DELETE/PATCH endpoints which require auth return 401/403 without a token
  - 公開エンドポイント (lint で EXEMPT 登録済み) は除外
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import pytest


# Lint scriptと同じ EXEMPT 一覧を再利用
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from lint_tenant_isolation import EXEMPT_ENDPOINTS  # noqa: E402


def _all_routes(app):
    """Collect (method, path, endpoint_module, endpoint_func_name) for all routes."""
    out = []
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None) or set()
        endpoint = getattr(route, "endpoint", None)
        if not (path and methods and endpoint):
            continue
        if not path.startswith("/api"):
            continue
        mod = endpoint.__module__.rsplit(".", 1)[-1]
        name = endpoint.__name__
        for m in methods:
            if m in ("HEAD", "OPTIONS"):
                continue
            out.append((m, path, mod, name))
    return out


def _replace_path_params(path: str) -> str:
    """Replace common path params with safe values."""
    repls = {
        "project_id", "phase_id", "worker_id", "photo_id", "report_id",
        "drawing_id", "contract_id", "tenant_id", "user_id", "ca_id",
        "milestone_id", "notification_id", "facility_id", "schedule_id",
        "element_id", "file_id", "log_id", "guide_id", "flow_id",
        "order_id", "record_id", "measurement_id", "inspection_id",
        "budget_id", "actual_id", "forecast_id", "comment_id",
        "subcontractor_id", "sub_id", "meeting_id", "manifest_id",
        "task_id", "invitation_id", "item_id", "override_id",
        "instruction_id", "announcement_id", "webhook_id", "key_id",
        "survey_id", "estimate_id", "job_id", "lead_id", "customer_id",
        "mid", "eid",
    }
    out = path
    for k in repls:
        out = out.replace("{" + k + "}", "00000000-0000-0000-0000-000000000000")
    out = out.replace("{sign_token}", "invalid")
    out = out.replace("{token}", "invalid")
    out = out.replace("{region}", "tokyo")
    out = out.replace("{work_type}", "test")
    out = out.replace("{subtype}", "test")
    out = out.replace("{path}", "test")
    return out


def test_all_authenticated_endpoints_reject_unauth(client):
    from main import app

    routes = _all_routes(app)
    failures: list[str] = []

    PUBLIC_PATHS = {
        "/api/health",
        "/api/files/{path:path}",  # ファイルサーバー（パストラバーサル検証は別テスト）
    }

    for method, path, mod, name in routes:
        if (mod, name) in EXEMPT_ENDPOINTS:
            continue
        if path in PUBLIC_PATHS:
            continue
        # SSE は long-poll なので除外
        if "/sse" in path:
            continue
        # webhook URL や iCal はトークンクエリで認証する場合があるので除外
        if "/integrations/ical" in path:
            continue

        url = _replace_path_params(path)
        if "{" in url:
            # 未対応のパスパラメータ
            continue

        resp = None
        try:
            if method == "GET":
                resp = client.get(url)
            elif method == "POST":
                resp = client.post(url, json={})
            elif method == "PUT":
                resp = client.put(url, json={})
            elif method == "DELETE":
                resp = client.delete(url)
            elif method == "PATCH":
                resp = client.patch(url, json={})
        except Exception as e:
            failures.append(f"{method} {path} ({mod}.{name}) raised: {e}")
            continue

        if resp is None:
            continue

        # 期待: 401, 403 のいずれか。422 (バリデーション) も認証通過なのでアウト。
        # 404 は path-paramが架空のため自然に出るが、認証が走らずに404が返るならNG。
        # ここでは「認証層を抜けたかどうか」を判定したいので、200/201/422 が来たらNG。
        if resp.status_code in (200, 201, 204, 422):
            failures.append(
                f"{method} {path} ({mod}.{name}) returned {resp.status_code} without auth"
            )
        # 500 はエンドポイントが認証の前にクラッシュした疑い（テナント未指定 etc）
        if resp.status_code == 500:
            body = resp.text[:200]
            failures.append(
                f"{method} {path} ({mod}.{name}) → 500 without auth: {body}"
            )

    assert not failures, "認証なしで応答してはいけないエンドポイント:\n" + "\n".join(failures)
