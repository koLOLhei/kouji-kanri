"""Green File テンプレート (全建統一様式) のレンダリングをテストする。

各テンプレートが Jinja2 でロードでき、最低限のコンテキストでレンダ後に
HTML として完全であることを保証する。回帰テスト用途。
"""

import pytest
from types import SimpleNamespace

from services.submission_engine import TEMPLATE_REGISTRY, jinja_env


GREEN_FILE_KEYS = [
    "sagyoin_meibo",
    "kensetsu_kaizen_todoke",
    "romu_anzen_seiyaku",
    "taisei_daicho_tsuchi",
    "mochikomi_crane",
    "mochikomi_denki_kogu",
    "kojiyou_sharyou",
    "yuki_yozai_todoke",
    "kaki_shiyou_negai",
    "jigyou_anzen_keikaku",
    "okuridashi_kyouiku",
    "nensho_kourei_houkoku",
    "ashiba_tenken",
    "anzen_keikaku_nenkan",
]


def _minimal_project():
    return SimpleNamespace(
        name="〇〇ビル新築工事",
        location="東京都世田谷区",
        start_date="2025-04-01",
        end_date="2026-03-31",
        client_name="株式会社サンプル",
        project_code="P-001",
        regional_spec=None,
    )


@pytest.mark.parametrize("key", GREEN_FILE_KEYS)
def test_green_file_template_registered(key):
    assert key in TEMPLATE_REGISTRY, f"{key} が TEMPLATE_REGISTRY 未登録"
    entry = TEMPLATE_REGISTRY[key]
    assert entry["category"] == "green_file"
    assert entry["file"].endswith(".html")
    assert entry["label_ja"]


@pytest.mark.parametrize("key", GREEN_FILE_KEYS)
def test_green_file_template_renders(key):
    """各テンプレートが Jinja2 でロード&レンダリング可能であること。"""
    entry = TEMPLATE_REGISTRY[key]
    tmpl = jinja_env.get_template(entry["file"])
    html = tmpl.render(
        project=_minimal_project(),
        company_name="株式会社サンプル",
        representative="山田 太郎",
        sender_company="株式会社サンプル",
        subcontractor_name="株式会社下請",
        inspector="山田 太郎",
        inspection_date="2025-05-01",
        education_date="2025-04-15",
        responsible_person="山田 太郎",
    )
    assert html.lstrip().lower().startswith("<!doctype")
    assert "</html>" in html
    assert entry["label_ja"] in html or "工事" in html  # 日本語コンテンツが含まれる


def test_total_template_count_increased():
    """グリーンファイル14件以上が登録されたことを確認 (回帰防止)。"""
    green_file_count = sum(
        1 for v in TEMPLATE_REGISTRY.values() if v.get("category") == "green_file"
    )
    assert green_file_count >= 14, f"green_file テンプレートが不足: {green_file_count}"


def test_sagyoin_meibo_has_compliance_fields():
    """作業員名簿には社会保険3種・雇用契約区分・建退共などのコンプラ必須項目を含む。"""
    tmpl = jinja_env.get_template(TEMPLATE_REGISTRY["sagyoin_meibo"]["file"])
    html = tmpl.render(project=_minimal_project(), workers=[])
    for keyword in ("健保", "年金", "雇用", "建退共", "雇用契約", "受入教育", "ふりがな"):
        assert keyword in html, f"作業員名簿に必須項目 {keyword!r} が無い"


def test_anzen_keikaku_nenkan_has_monthly_grid():
    """年間計画書は12ヶ月グリッドと重点施策を持つ。"""
    tmpl = jinja_env.get_template(TEMPLATE_REGISTRY["anzen_keikaku_nenkan"]["file"])
    html = tmpl.render(project=_minimal_project())
    # 4月～3月の12ヶ月ヘッダ
    for month in ("4", "5", "6", "7", "8", "9", "10", "11", "12", "1", "2", "3"):
        assert f">{month}<" in html, f"月別グリッド {month}月 ヘッダが無い"
    assert "重点施策" in html
    assert "リスクアセスメント" in html


def test_anzen_keikaku_nenkan_fiscal_month_alignment():
    """カスタム strategies で months=[4] を渡したら、4月列(=最左の月列)に○が入ること。

    過去のバグ: ループが range(1,13) で 1月始まりだったので、
    months=[4] が4月列ではなく1月列に表示されていた。
    """
    tmpl = jinja_env.get_template(TEMPLATE_REGISTRY["anzen_keikaku_nenkan"]["file"])
    html = tmpl.render(
        project=_minimal_project(),
        strategies=[
            {"theme": "TEST_THEME", "action": "TEST_ACTION", "goal": "g", "owner": "o",
             "months": [4], "note": "n", "remark": "r"}
        ],
    )
    # custom strategy 行を抽出
    import re
    row_match = re.search(r"<tr>\s*<td>TEST_THEME</td>(.*?)</tr>", html, re.DOTALL)
    assert row_match, "TEST_THEME 行が見つからない"
    row = row_match.group(1)
    # ○ 出現回数 = 1 (4月のみ)
    assert row.count("○") == 1, f"○ が4月のみ1個でなく {row.count('○')} 個"
    # th-headers の順は 4,5,6,7,8,9,10,11,12,1,2,3。tdの○の位置(1番目=4月)
    cells = re.findall(r"<td[^>]*>([^<]*)</td>", row)
    # row capture excludes opening <td>TEST_THEME</td>, so:
    # cells: action, goal, owner, m4, m5, ..., m3, note, remark = 3+12+2 = 17 cells
    month_cells = cells[3:15]
    assert len(month_cells) == 12, f"月セル数が12でない: {len(month_cells)} cells={cells}"
    assert month_cells[0].strip() == "○", f"4月列(idx 0) が○でない: {month_cells}"
    assert all(c.strip() == "" for c in month_cells[1:]), f"他月に○: {month_cells}"


def test_form_titles_match_zenken_standard():
    """フォームタイトルが全建統一様式の正式名称と一致する (誤字回帰防止)。"""
    cases = [
        ("kensetsu_kaizen_todoke", "建設業法・雇用改善法等に基づく届出書"),
        ("mochikomi_crane", "持込機械等(車両系建設機械等)使用届"),
        ("mochikomi_denki_kogu", "持込機械等(電動工具・電気溶接機等)使用届"),
        ("okuridashi_kyouiku", "送り出し教育実施報告書"),
    ]
    for key, expected in cases:
        entry = TEMPLATE_REGISTRY[key]
        assert entry["label_ja"] == expected, f"{key}: registry label_ja {entry['label_ja']!r} != {expected!r}"
        tmpl = jinja_env.get_template(entry["file"])
        html = tmpl.render(project=_minimal_project())
        assert expected in html, f"{key}: テンプレートに {expected!r} が無い"
