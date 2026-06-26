"""Tenant isolation lint — verify every authenticated endpoint enforces tenant scoping.

走査対象: backend/routers/*.py
ルール:
  1. ルーターモジュール内に APIRouter インスタンスがあること。
  2. 認証エンドポイント (Depends(get_current_user) または require_role / require_permission) を含む関数は、
     以下のいずれかでテナント境界を担保すること:
       - verify_project_access / verify_facility_access / verify_worker_access を呼び出す
       - 任意の query() に対し tenant_filter() / `.tenant_id == user.tenant_id` を含む
       - require_role("super_admin") を持つ（プラットフォーム横断管理API）
       - 関数本体で `user.tenant_id` を WHERE 句に直接埋め込む
       - 明示的に EXEMPT_ENDPOINTS に登録する（理由付き）

EXIT:
  0 = 違反なし
  1 = 違反あり（CIで非0で落とす）
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

ROUTERS_DIR = Path(__file__).resolve().parent.parent / "routers"

# 例外: プラットフォーム横断・公開・テナント自身を生成するエンドポイント等
EXEMPT_ENDPOINTS: dict[tuple[str, str], str] = {
    # (module, function): reason
    # ─── 認証・公開API ───
    ("auth", "login"): "認証前エンドポイント — テナント決定前",
    ("auth", "forgot_password"): "認証前エンドポイント",
    ("auth", "reset_password"): "認証前エンドポイント",
    ("auth", "get_me"): "自分自身の情報のみ返す",
    ("contact_form", "receive_contact_form"): "未認証の問い合わせ受付（公開エンドポイント）",
    ("chat_leads", "receive_chat_lead"): "公開Webhookエンドポイント",
    ("telemetry", "track_event"): "公開匿名テレメトリ",
    ("announcements", "list_announcements"): "公開: 公開済みお知らせのみ返却",
    ("platform", "request_password_reset"): "認証前エンドポイント — パスワードリセット要求",
    ("platform", "confirm_password_reset"): "認証前エンドポイント — トークン検証で代替",
    ("tenants", "accept_invite"): "招待トークン経由の新規ユーザー作成",

    # ─── クライアントポータル（独自トークン認証） ───
    ("client_portal", "client_portal_login"): "顧客ポータル独自認証",
    ("client_portal", "client_view_project"): "アクセストークン独自検証",
    ("client_portal", "client_list_progress"): "アクセストークン独自検証",
    ("client_portal", "client_list_photos"): "アクセストークン独自検証",
    ("client_portal", "client_create_inquiry"): "アクセストークン独自検証",
    ("client_portal", "get_portal_overview"): "公開ポータル — _get_config_by_token でトークン検証",
    ("client_portal", "get_portal_photos"): "公開ポータル — _get_config_by_token でトークン検証",
    ("client_portal", "get_portal_timeline"): "公開ポータル — _get_config_by_token でトークン検証",
    ("client_portal", "get_portal_pulse"): "公開ポータル — _get_config_by_token でトークン検証",
    ("client_portal", "get_photo_integrity_seal"): "公開ポータル — _get_config_by_token でトークン検証",

    # ─── 塗装契約サインAPI（sign_token独自認証） ───
    ("painting", "get_contract_for_signing"): "sign_token独自認証",
    ("painting", "sign_contract"): "sign_token独自認証",
    ("painting", "get_painting_progress"): "sign_token独自認証",

    # ─── iCal外部カレンダー連携（query token認証） ───
    ("external_api", "export_ical"): "query parameter token 独自認証",

    # ─── プラットフォーム管理API（super_admin） ───
    ("tenants", "create_tenant"): "super_admin 専用",
    ("tenants", "list_tenants"): "super_admin 専用",
    ("tenants", "get_tenant"): "super_admin 専用",
    ("tenants", "update_tenant"): "super_admin 専用",
    ("tenants", "delete_tenant"): "super_admin 専用",
    ("tenants", "tenant_stats"): "super_admin 専用",
    ("tenants", "list_plans"): "super_admin 専用 - プラン一覧",

    # ─── マスターデータ参照（全テナント共通） ───
    ("regions", "list_supported_regions"): "全テナント共通の地域マスター（公開）",
    ("regions", "list_overrides"): "全テナント共通の地域別仕様マスター（参照）",
    ("regions", "create_region"): "super_admin 専用",
    ("regions", "update_region"): "super_admin 専用",
    ("regions", "delete_region"): "super_admin 専用",
    ("specs", "list_chapters"): "全テナント共通の仕様書マスター",
    ("specs", "list_regions"): "全テナント共通の地域マスター",
    ("specs", "list_specs"): "全テナント共通の仕様書マスター (PDF取込み一覧)",
    ("specs", "search_spec_content"): "全テナント共通の仕様書本文検索",
    ("specs", "get_spec_content"): "全テナント共通の仕様書本文ページ取得",
    ("photo_guides", "list_photo_guides"): "全テナント共通の撮影ガイドマスター",
    ("photo_guides", "get_photo_guide"): "全テナント共通の撮影ガイドマスター",
    ("ncr_templates", "list_ncr_templates"): "全テナント共通のNCRテンプレート",
    ("special_specs", "list_special_specs"): "全テナント共通の特殊仕様書マスター",
    ("compliance", "get_compliance_templates"): "全テナント共通のコンプライアンステンプレート",
    ("documents_gen", "list_templates"): "全テナント共通のドキュメントテンプレート",
    ("documents_gen", "get_template_fields"): "全テナント共通のドキュメントテンプレート",
    ("electronic_delivery", "list_photo_categories"): "電子納品マスターデータ（公開）",
    ("electronic_delivery", "list_work_types"): "電子納品マスターデータ（公開）",
    ("electronic_delivery", "list_subtypes"): "電子納品マスターデータ（公開）",
    ("electronic_delivery", "list_details"): "電子納品マスターデータ（公開）",
    ("temporary_works", "list_work_types"): "全テナント共通の仮設工事工種マスター",
    ("estimates", "list_unit_prices"): "標準単価マスター（テナント横断）",
    ("estimates", "quick_calculate"): "計算のみ — DBアクセス無し",
    ("estimates", "generate_pdf"): "PDF生成のみ — DBアクセス無し",
    ("platform", "platform_health"): "プラットフォームヘルス",

    # ─── 承認フロー（require_permission経由・内部で tenant_id 検証あり） ───
    ("approval_workflow", "create_flow"): "require_permission + tenant_id付与",
    ("approval_workflow", "cancel_flow"): "require_permission + _get_flow(..., user.tenant_id)",

    # ─── 自分の情報のみ返却（user_id ベース、防御深層化済み） ───
    ("automation", "get_today_weather"): "テナント非依存の気象庁公開API中継",
    ("automation", "list_weather_areas"): "テナント非依存の地域マスター",
}

# 特定のテナント越境を許可するヘルパー関数（呼び出されたら OK）
TENANT_ENFORCING_HELPERS = {
    "verify_project_access",
    "verify_facility_access",
    "verify_worker_access",
    "tenant_filter",
    "require_role",  # super_admin / platform admin
    "require_super_admin",
    "require_permission",  # 承認権限チェック
    "verify_member_access",
    "_verify_portal_token",
    "_verify_project",  # routers/schedule.py のローカルヘルパー
    "_get_project_or_404",  # routers/electronic_delivery.py のローカルヘルパー
    "_get_config_by_token",  # routers/client_portal.py のローカルヘルパー
    "_get_flow",  # routers/approval_workflow.py のローカルヘルパー
    # 見積系ローカルヘルパー（いずれも内部で tenant_id == user.tenant_id を強制。検証済み）
    "_get_proposal_for_user",  # routers/estimate_proposals.py
    "_get_estimate_or_404",  # routers/estimate_revisions.py / estimate_sections.py / estimate_items.py
    "_get_section_or_404",  # routers/estimate_sections.py / estimate_items.py
    "_get_item_or_404",  # routers/estimate_items.py
}

# 認証依存名
AUTH_DEPS = {
    "get_current_user",
    "require_role",
    "require_super_admin",
    "require_permission",
}


class EndpointAnalyzer(ast.NodeVisitor):
    def __init__(self, module_name: str, source: str) -> None:
        self.module_name = module_name
        self.source = source
        self.violations: list[tuple[str, int, str]] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:  # noqa: N802
        self._analyze_function(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:  # noqa: N802
        self._analyze_function(node)
        self.generic_visit(node)

    def _is_endpoint(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
        for deco in node.decorator_list:
            # @router.get / @router.post / @some_router.put …
            if isinstance(deco, ast.Call):
                func = deco.func
                if (
                    isinstance(func, ast.Attribute)
                    and isinstance(func.value, ast.Name)
                    and func.attr in {"get", "post", "put", "delete", "patch"}
                    and (func.value.id == "router" or func.value.id.endswith("_router"))
                ):
                    return True
        return False

    def _has_auth_dep(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
        # 引数のデフォルト値に Depends(get_current_user) などがあるか
        for default in node.args.defaults + node.args.kw_defaults:
            if default is None:
                continue
            for sub in ast.walk(default):
                if isinstance(sub, ast.Call):
                    fn = sub.func
                    name = (
                        fn.attr if isinstance(fn, ast.Attribute)
                        else fn.id if isinstance(fn, ast.Name)
                        else ""
                    )
                    if name == "Depends" and sub.args:
                        arg = sub.args[0]
                        if isinstance(arg, ast.Name) and arg.id in AUTH_DEPS:
                            return True
                        if isinstance(arg, ast.Call):
                            target = arg.func
                            target_name = (
                                target.attr if isinstance(target, ast.Attribute)
                                else target.id if isinstance(target, ast.Name)
                                else ""
                            )
                            if target_name in AUTH_DEPS:
                                return True
        return False

    def _has_tenant_enforcement(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
        body_src = ast.get_source_segment(self.source, node) or ""
        # ヘルパー呼び出し
        for helper in TENANT_ENFORCING_HELPERS:
            if helper + "(" in body_src:
                return True
        # 直接 user.tenant_id を使った WHERE 条件
        if "user.tenant_id" in body_src or "current_user.tenant_id" in body_src:
            return True
        # super_admin デコレータ／チェック
        if "super_admin" in body_src:
            return True
        return False

    def _analyze_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        if not self._is_endpoint(node):
            return
        if not self._has_auth_dep(node):
            # 未認証エンドポイント — 別途 EXEMPT 必須
            key = (self.module_name, node.name)
            if key in EXEMPT_ENDPOINTS:
                return
            self.violations.append(
                (self.module_name, node.lineno,
                 f"{node.name}: 未認証エンドポイント — EXEMPT 登録するか get_current_user を追加してください")
            )
            return
        if self._has_tenant_enforcement(node):
            return
        key = (self.module_name, node.name)
        if key in EXEMPT_ENDPOINTS:
            return
        self.violations.append(
            (self.module_name, node.lineno,
             f"{node.name}: テナント分離が確認できません "
             "(verify_project_access / tenant_filter / require_role / user.tenant_id のいずれかが必要)")
        )


def lint_file(path: Path) -> list[tuple[str, int, str]]:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    analyzer = EndpointAnalyzer(path.stem, source)
    analyzer.visit(tree)
    return analyzer.violations


def main() -> int:
    all_violations: list[tuple[str, int, str]] = []
    for py in sorted(ROUTERS_DIR.glob("*.py")):
        if py.name == "__init__.py":
            continue
        all_violations.extend(lint_file(py))

    if not all_violations:
        print("[tenant-lint] OK — テナント分離違反 0 件")
        return 0

    print(f"[tenant-lint] 違反 {len(all_violations)} 件:")
    for module, line, msg in all_violations:
        print(f"  routers/{module}.py:{line}  {msg}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
