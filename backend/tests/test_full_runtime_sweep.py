"""Full runtime sweep: every endpoint with valid auth must NOT return 500.

Hits every endpoint with admin auth and verifies that 500 (server error) does not occur.
- 422 (validation) は許容: 必須フィールド欠落
- 404/400/403 も許容: ID不在等
- 200/201/204 は OK
- 500 のみ NG
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))


def _replace_path_params(path: str) -> str:
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


def _all_routes(app):
    out = []
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None) or set()
        endpoint = getattr(route, "endpoint", None)
        if not (path and methods and endpoint):
            continue
        if not path.startswith("/api"):
            continue
        for m in methods:
            if m in ("HEAD", "OPTIONS"):
                continue
            out.append((m, path, endpoint.__module__.rsplit(".", 1)[-1], endpoint.__name__))
    return out


def test_no_500_with_admin_auth(client, admin_a_token, auth, project_factory, tenant_a):
    """Every endpoint must respond without 500 when called with valid admin auth + minimal body."""
    from main import app

    # Create a project so endpoints with project_id can do real lookups
    p = project_factory(tenant_a.id)
    pid = p.id

    # Skip lists
    SKIP_PATHS = {
        "/api/sse",
        "/api/sse/notifications",
        "/api/integrations/ical/{project_id}",  # SSE-like long response
    }
    SKIP_PATTERNS = ("/sse",)
    # Endpoints that might do file uploads expecting multipart (our empty json body causes 415)
    SKIP_MULTIPART_PATHS = (
        "/photos", "/files", "/upload", "/import", "/qr-checkin",
        "/photo-album",  # large bg generation
        "/electronic-delivery/generate",  # background ZIP build
        "/bulk-download",  # background ZIP
        "/photo-ledger/pdf",  # heavy PDF work
        "/completion-report/pdf",
        "/warranty/pdf",
        "/admin/backup",
    )

    routes = _all_routes(app)
    failures: list[str] = []

    headers = auth(admin_a_token)
    for method, path, mod, name in routes:
        if path in SKIP_PATHS:
            continue
        if any(p in path for p in SKIP_PATTERNS):
            continue
        if any(s in path for s in SKIP_MULTIPART_PATHS):
            continue

        url = _replace_path_params(path).replace(
            "00000000-0000-0000-0000-000000000000",
            pid,
            1,  # 最初の1個だけ実プロジェクトIDに置換 → 自然なテナント検証パスを通す
        ) if "{project_id}" in path else _replace_path_params(path)

        if "{" in url:
            continue

        try:
            if method == "GET":
                resp = client.get(url, headers=headers)
            elif method == "POST":
                resp = client.post(url, json={}, headers=headers)
            elif method == "PUT":
                resp = client.put(url, json={}, headers=headers)
            elif method == "DELETE":
                resp = client.delete(url, headers=headers)
            elif method == "PATCH":
                resp = client.patch(url, json={}, headers=headers)
            else:
                continue
        except Exception as e:
            failures.append(f"{method} {path} ({mod}.{name}) raised: {type(e).__name__}: {e}")
            continue

        if resp.status_code == 500:
            failures.append(f"{method} {path} ({mod}.{name}) → 500: {resp.text[:200]}")

    assert not failures, "500 を返したエンドポイント:\n" + "\n".join(failures)
