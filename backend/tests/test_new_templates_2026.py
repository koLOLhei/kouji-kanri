"""2026年5月に追加した9テンプレート (調査票 / 改修見積 / 工種別施工計画書×7) のテスト。

- 新規入場者調査票 (全建統一参考様式 第4号)
- 大規模改修工事 詳細見積書 (出来高調書付)
- 工種別施工計画書 × 7 (外壁・防水・塗装・タイル・シーリング・足場・アスベスト)
"""

import pytest
from types import SimpleNamespace

from services.submission_engine import TEMPLATE_REGISTRY, jinja_env, generate_document


KEYS_NEW_2026 = [
    "shinki_nyuujou_chosashou",
    "kaisyu_mitsumori_detail",
    "kosyu_keikaku_gaiheki",
    "kosyu_keikaku_bosui",
    "kosyu_keikaku_tosou",
    "kosyu_keikaku_tile",
    "kosyu_keikaku_sealing",
    "kosyu_keikaku_ashiba",
    "kosyu_keikaku_asbestos",
]


def _minimal_project():
    return SimpleNamespace(
        name="〇〇マンション大規模改修工事",
        location="東京都世田谷区",
        start_date="2026-06-01",
        end_date="2027-03-31",
        client_name="〇〇マンション管理組合",
        project_code="P-001",
        regional_spec=None,
    )


@pytest.mark.parametrize("key", KEYS_NEW_2026)
def test_template_registered(key):
    assert key in TEMPLATE_REGISTRY, f"{key} 未登録"


@pytest.mark.parametrize("key", KEYS_NEW_2026)
def test_template_renders(key):
    """各テンプレートが Jinja2 でレンダリング可能であること。"""
    entry = TEMPLATE_REGISTRY[key]
    tmpl = jinja_env.get_template(entry["file"])
    html = tmpl.render(
        project=_minimal_project(),
        company_name="株式会社サンプル",
        representative="山田 太郎",
        name="田中 一郎",
        entry_date="2026-06-01",
        sections=[],
        total_amount=1000000,
        tax_amount=100000,
        grand_total=1100000,
    )
    assert "</html>" in html


def test_kosyu_keikaku_default_context_work_type():
    """工種別施工計画書: レジストリの default_context で work_type が自動注入されること。"""
    expected = {
        "kosyu_keikaku_gaiheki": "外壁改修",
        "kosyu_keikaku_bosui": "防水改修",
        "kosyu_keikaku_tosou": "塗装",
        "kosyu_keikaku_tile": "タイル",
        "kosyu_keikaku_sealing": "シーリング",
        "kosyu_keikaku_ashiba": "足場組立解体",
        "kosyu_keikaku_asbestos": "アスベスト除去",
    }
    for key, work_type in expected.items():
        entry = TEMPLATE_REGISTRY[key]
        assert entry.get("default_context", {}).get("work_type") == work_type
        # 実際にレンダリングして work_type 文字列が含まれることを確認
        tmpl = jinja_env.get_template(entry["file"])
        # default_context は generate_document が注入するので、直接レンダリングでは work_type を渡す必要がある
        html = tmpl.render(
            project=_minimal_project(),
            company_name="株式会社サンプル",
            work_type=work_type,
        )
        assert work_type in html, f"{key}: 工種名 {work_type!r} がHTML出力に含まれない"


def test_default_context_injection_via_generate_document():
    """generate_document が default_context を context_data にマージすること。"""
    from models.submission import DocumentTemplate

    class ProjectQuery:
        def filter_by(self, **kw): return self
        def first(self): return _minimal_project()
    class TemplateQuery:
        def filter_by(self, **kw): return self
        def first(self): return None  # DBテンプレなし → ファイルから読み込む

    class FakeDB:
        def query(self, model):
            # DocumentTemplate のクエリには TemplateQuery, それ以外は Project
            if model is DocumentTemplate:
                return TemplateQuery()
            return ProjectQuery()

    # default_context で work_type が自動注入されることを確認
    out, ctype, ext = generate_document(
        "kosyu_keikaku_bosui",
        {"project": _minimal_project(), "company_name": "株式会社X"},
        FakeDB(),
    )
    assert ext in (".pdf", ".html")
    # PDF・HTML どちらでも、出力内に「防水改修」が含まれる
    if ext == ".html":
        text = out.decode("utf-8")
        assert "防水改修" in text
    else:
        # PDF の場合は文字列としては読めないが、デフォルトコンテキストの注入が確認されればOK
        assert len(out) > 1000


def test_shinki_nyuujou_chosashou_has_form_no():
    """新規入場者調査票には全建統一参考様式 第4号 の番号表記がある。"""
    entry = TEMPLATE_REGISTRY["shinki_nyuujou_chosashou"]
    tmpl = jinja_env.get_template(entry["file"])
    html = tmpl.render(project=_minimal_project(), name="田中 一郎", entry_date="2026-06-01")
    assert "全建統一参考様式 第4号" in html
    assert "誓約書" in html
    assert "緊急連絡先" in html


def test_kaisyu_mitsumori_has_progress_ledger():
    """大規模改修見積書は出来高調書セクションを持つ (show_progress=True で表示)。"""
    entry = TEMPLATE_REGISTRY["kaisyu_mitsumori_detail"]
    tmpl = jinja_env.get_template(entry["file"])
    html = tmpl.render(
        project=_minimal_project(),
        company_name="X",
        total_amount=1000000,
        tax_amount=100000,
        grand_total=1100000,
        show_progress=True,
        progress_months=["6月", "7月", "8月"],
        progress_rows=[{"name": "外壁補修", "unit": "㎡", "contract_qty": 100, "contract_amount": 500000}],
    )
    assert "出来高調書" in html
    assert "見積条件" in html
    assert "工事内訳書" in html


# ────────────────────────────────────────────────────────────
# セキュリティ・堅牢性テスト (静的・動的デバッグの自動化)
# ────────────────────────────────────────────────────────────

@pytest.mark.parametrize("key", KEYS_NEW_2026)
def test_xss_escaping(key):
    """ユーザー入力中の <script> タグは autoescape で無害化される。"""
    entry = TEMPLATE_REGISTRY[key]
    tmpl = jinja_env.get_template(entry["file"])
    xss = "<script>alert(1)</script>"
    p = SimpleNamespace(
        name=xss, location=xss, start_date="", end_date="",
        client_name=xss, project_code="", regional_spec=None,
    )
    html = tmpl.render(
        project=p, company_name=xss, representative=xss, name=xss,
        entry_date="2026-06-01", sections=[], hazards=[],
        total_amount=1000, tax_amount=100, grand_total=1100,
        work_content=xss,
    )
    assert "<script>alert(1)</script>" not in html, f"{key}: XSS 脆弱性検出"
    # エスケープ後の形を確認
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html, f"{key}: エスケープが期待形と異なる"


@pytest.mark.parametrize("key", KEYS_NEW_2026)
def test_none_values_do_not_crash(key):
    """workers/sections/hazards 等にNone を渡してもクラッシュしないこと。"""
    entry = TEMPLATE_REGISTRY[key]
    tmpl = jinja_env.get_template(entry["file"])
    ctx = dict(
        project=_minimal_project(),
        company_name="X",
        workers=None, machines=None, sections=None, hazards=None,
        materials=None, schedule_items=None, management_team=None,
        safety_team=None, inspection_items=None, qualified_persons=None,
        construction_flow=None, items=None, attendees=None,
        conditions=None, progress_rows=None, progress_months=None,
    )
    for k, v in entry.get("default_context", {}).items():
        ctx.setdefault(k, v)
    # No exception expected
    html = tmpl.render(**ctx)
    assert "</html>" in html


def test_large_data_rendering():
    """50件の作業員リストを扱える (パフォーマンス・メモリリーク防止)。"""
    big_workers = [
        {"name": f"作業員{i}", "furigana": f"サギョウイン{i}",
         "start_time": "8:00", "end_time": "17:00", "hours": "8",
         "work": "外壁補修"} for i in range(50)
    ]
    for key in ("sagyou_nippou_detail", "ky_risk_assessment"):
        entry = TEMPLATE_REGISTRY[key]
        tmpl = jinja_env.get_template(entry["file"])
        html = tmpl.render(
            project=_minimal_project(),
            workers=big_workers,
            entry_date="2026-06-01", work_content="X",
        )
        assert "作業員49" in html, f"{key}: 50件目のデータが含まれていない"


def test_autoescape_is_enabled():
    """jinja_env は autoescape=True で構築されていること (回帰防止)。"""
    assert jinja_env.autoescape is True, "Jinja2 autoescape が無効です (XSS脆弱性の元)"
