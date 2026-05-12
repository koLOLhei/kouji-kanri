"""Smoke tests for every router that doesn't have a dedicated test file.

For each module:
  1. its routes exist in the OpenAPI schema
  2. at least one of its endpoints requires auth (or is registered in EXEMPT)
  3. the module imports cleanly (syntax/runtime errors fail the test)
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

# 各 router にひとつ以上の認証必須 GET エンドポイントを持つことを確認するだけの
# 軽量スモーク。認証層のリグレッションを検出する。
# CRUD 詳細は dedicated test ファイル側でカバー。

ROUTERS_WITHOUT_DEDICATED_TESTS = [
    "analytics", "announcements", "approval_workflow", "automation",
    "batch_documents", "bulk_download", "business_flows", "case_study",
    "ccus", "chat_leads", "client_portal", "company_dashboard",
    "completion_drawings", "compliance", "concrete", "construction_loans",
    "contact_form", "crm", "cron_tasks", "daily_report_photos",
    "daily_workflow", "design_changes", "document_versions",
    "documents_gen", "drawing_mappings", "entity_links", "esign",
    "estimates", "exports", "external_api", "file_integrity",
    "finish_samples", "government_filings", "green_files", "handover",
    "instructions", "invoices", "legal_inspections", "material_approvals",
    "ncr_templates", "neighborhood", "painting", "performance",
    "photo_album", "photo_guides", "project_history", "project_members",
    "punch_list", "push_alerts", "qr_checkin", "quality",
    "recycling_notices", "resource_conflicts", "retirement_mutual_aid",
    "safety_ai", "sales_pipeline", "signatures", "special_specs",
    "staffing", "steel_inspections", "subcontractor_evaluations",
    "submissions", "sync", "telemetry", "temporary_works",
    "ve_proposals", "weather", "work_packages", "platform",
    "calendar_routes", "equipment_routes",
]


@pytest.mark.parametrize("module_name", ROUTERS_WITHOUT_DEDICATED_TESTS)
def test_router_module_imports_cleanly(module_name):
    """Each router module must import without errors."""
    mod = importlib.import_module(f"routers.{module_name}")
    assert mod is not None


@pytest.mark.parametrize("module_name", ROUTERS_WITHOUT_DEDICATED_TESTS)
def test_router_module_has_at_least_one_route(module_name):
    """Each router module must register at least one route on its APIRouter."""
    mod = importlib.import_module(f"routers.{module_name}")
    found_router = False
    for attr_name in dir(mod):
        attr = getattr(mod, attr_name)
        from fastapi import APIRouter
        if isinstance(attr, APIRouter) and (attr_name == "router" or attr_name.endswith("_router")):
            found_router = True
            assert len(attr.routes) > 0, f"{module_name}: APIRouter {attr_name} has no routes"
    assert found_router, f"{module_name}: no APIRouter instance found"


def _replace_path(path: str) -> str:
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
        "submission_id", "version_id", "checkin_id", "step_id",
        "mid", "eid",
    }
    out = path
    for k in repls:
        out = out.replace("{" + k + "}", "00000000-0000-0000-0000-000000000000")
    out = out.replace("{sign_token}", "invalid").replace("{token}", "invalid")
    out = out.replace("{region}", "tokyo").replace("{work_type}", "test").replace("{subtype}", "test")
    out = out.replace("{version_number}", "1")
    out = out.replace("{path:path}", "test.txt").replace("{path}", "test.txt")
    return out


@pytest.mark.parametrize("module_name", ROUTERS_WITHOUT_DEDICATED_TESTS)
def test_router_has_authenticated_endpoints(module_name, client):
    """少なくとも1つは認証必須または EXEMPT に登録されたエンドポイントがある。"""
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
    from lint_tenant_isolation import EXEMPT_ENDPOINTS

    from main import app

    matching_routes = [
        r for r in app.routes
        if getattr(r, "endpoint", None) and r.endpoint.__module__.endswith(f".{module_name}")
    ]
    assert matching_routes, f"{module_name}: no routes registered on app"

    has_auth_or_exempt = False
    for route in matching_routes:
        path = route.path
        methods = route.methods or set()
        name = route.endpoint.__name__
        url = _replace_path(path)
        if "{" in url:
            continue
        if "/sse" in path:
            has_auth_or_exempt = True
            break
        if (module_name, name) in EXEMPT_ENDPOINTS:
            has_auth_or_exempt = True
            break
        # GET / POST / PUT / DELETE のいずれでも認証層が動けばOK
        for method in ("GET", "POST", "PUT", "DELETE"):
            if method not in methods:
                continue
            if method == "GET":
                resp = client.get(url)
            elif method == "POST":
                resp = client.post(url, json={})
            elif method == "PUT":
                resp = client.put(url, json={})
            else:
                resp = client.delete(url)
            if resp.status_code in (401, 403):
                has_auth_or_exempt = True
                break
        if has_auth_or_exempt:
            break

    assert has_auth_or_exempt, f"{module_name}: no authenticated endpoint found"
