"""見積書自動生成サービス — 平米単価×面積で自動計算＋PDF生成。"""

from datetime import date
from io import BytesIO
from jinja2 import Template
from weasyprint import HTML


# 標準単価テーブル（税抜）
UNIT_PRICES = {
    "外壁塗装_シリコン": {"unit_price": 2800, "unit": "m2", "label": "外壁塗装（シリコン塗料）"},
    "外壁塗装_フッ素": {"unit_price": 3800, "unit": "m2", "label": "外壁塗装（フッ素塗料）"},
    "外壁塗装_クリアコート": {"unit_price": 3200, "unit": "m2", "label": "外壁塗装（クリアコート10年保証）"},
    "屋根塗装": {"unit_price": 2500, "unit": "m2", "label": "屋根塗装"},
    "シーリング打ち替え": {"unit_price": 900, "unit": "m", "label": "シーリング打ち替え"},
    "シーリング増し打ち": {"unit_price": 500, "unit": "m", "label": "シーリング増し打ち"},
    "足場設置": {"unit_price": 800, "unit": "m2", "label": "足場設置・撤去"},
    "高圧洗浄": {"unit_price": 200, "unit": "m2", "label": "高圧洗浄"},
    "下地処理_クラック補修": {"unit_price": 1200, "unit": "m", "label": "下地処理（クラック補修）"},
    "防水工事_ウレタン": {"unit_price": 4500, "unit": "m2", "label": "防水工事（ウレタン塗膜）"},
    "防水工事_シート": {"unit_price": 5500, "unit": "m2", "label": "防水工事（シート防水）"},
    "タイル補修": {"unit_price": 15000, "unit": "m2", "label": "タイル補修（浮き・剥離）"},
    "内装_壁紙張替": {"unit_price": 1200, "unit": "m2", "label": "壁紙・クロス張替え"},
    "内装_フローリング": {"unit_price": 8000, "unit": "m2", "label": "フローリング張替え"},
}

TAX_RATE = 0.10


def calculate_estimate(items: list[dict]) -> dict:
    """見積明細を計算。

    items: [{"item_code": "外壁塗装_シリコン", "quantity": 200, "note": "北面・南面"}]
    """
    lines = []
    subtotal = 0
    for item in items:
        code = item.get("item_code", "")
        qty = item.get("quantity", 0)
        custom_price = item.get("unit_price")  # カスタム単価（オプション）
        note = item.get("note", "")

        price_info = UNIT_PRICES.get(code)
        if not price_info:
            continue

        unit_price = custom_price if custom_price is not None else price_info["unit_price"]
        amount = int(unit_price * qty)
        subtotal += amount
        lines.append({
            "label": price_info["label"],
            "unit": price_info["unit"],
            "quantity": qty,
            "unit_price": unit_price,
            "amount": amount,
            "note": note,
        })

    tax = int(subtotal * TAX_RATE)
    total = subtotal + tax

    return {
        "lines": lines,
        "subtotal": subtotal,
        "tax": tax,
        "tax_rate": TAX_RATE,
        "total": total,
    }


ESTIMATE_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8">
<style>
  body { font-family: "Hiragino Kaku Gothic Pro", sans-serif; font-size: 11px; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 22px; text-align: center; letter-spacing: 0.3em; font-weight: 300; margin-bottom: 8px; }
  .subtitle { text-align: center; font-size: 10px; color: #888; letter-spacing: 0.15em; margin-bottom: 40px; }
  .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .info-left, .info-right { width: 48%; }
  .info-left p, .info-right p { margin: 4px 0; }
  .client-name { font-size: 16px; font-weight: 500; border-bottom: 1px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 16px; }
  .total-box { background: #f8f8f8; padding: 16px 24px; text-align: right; margin-bottom: 30px; }
  .total-label { font-size: 12px; color: #888; }
  .total-amount { font-size: 28px; font-weight: 300; letter-spacing: 0.05em; }
  .total-tax { font-size: 10px; color: #888; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1a1a1a; color: white; padding: 8px 12px; font-size: 10px; letter-spacing: 0.1em; font-weight: 400; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .text-right { text-align: right; }
  .subtotal-row td { border-top: 2px solid #1a1a1a; font-weight: 500; }
  .notes { margin-top: 30px; padding: 16px; background: #f8f8f8; font-size: 10px; color: #666; line-height: 1.8; }
  .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #aaa; }
  .stamp-area { width: 80px; height: 80px; border: 1px solid #ccc; margin-left: auto; text-align: center; line-height: 80px; font-size: 10px; color: #ccc; }
</style>
</head>
<body>
  <h1>御 見 積 書</h1>
  <p class="subtitle">ESTIMATE</p>

  <div class="info">
    <div class="info-left">
      <p class="client-name">{{ client_name }} 様</p>
      <p>件名: {{ project_name }}</p>
      <p>工事場所: {{ location }}</p>
      <p>見積日: {{ estimate_date }}</p>
      <p>有効期限: 見積日より30日間</p>
    </div>
    <div class="info-right" style="text-align: right;">
      <div class="stamp-area">印</div>
      <p style="margin-top: 12px;"><strong>株式会社KAMO</strong></p>
      <p>〒213-0013</p>
      <p>神奈川県川崎市高津区末長1-52-37-104</p>
      <p>TEL: 044-948-9115 / FAX: 044-948-9114</p>
      <p>神奈川県知事 許可（般-24）第78388号</p>
    </div>
  </div>

  <div class="total-box">
    <p class="total-label">お見積金額（税込）</p>
    <p class="total-amount">&yen; {{ "{:,}".format(total) }}</p>
    <p class="total-tax">（税抜 &yen;{{ "{:,}".format(subtotal) }} + 消費税 &yen;{{ "{:,}".format(tax) }}）</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:5%">No</th>
        <th style="width:35%">項目</th>
        <th style="width:10%">単位</th>
        <th class="text-right" style="width:12%">数量</th>
        <th class="text-right" style="width:15%">単価</th>
        <th class="text-right" style="width:18%">金額</th>
        <th style="width:5%">備考</th>
      </tr>
    </thead>
    <tbody>
      {% for line in lines %}
      <tr>
        <td>{{ loop.index }}</td>
        <td>{{ line.label }}</td>
        <td>{{ line.unit }}</td>
        <td class="text-right">{{ "{:,.1f}".format(line.quantity) }}</td>
        <td class="text-right">&yen;{{ "{:,}".format(line.unit_price) }}</td>
        <td class="text-right">&yen;{{ "{:,}".format(line.amount) }}</td>
        <td>{{ line.note }}</td>
      </tr>
      {% endfor %}
      <tr class="subtotal-row">
        <td colspan="5" class="text-right">小計</td>
        <td class="text-right">&yen;{{ "{:,}".format(subtotal) }}</td>
        <td></td>
      </tr>
      <tr>
        <td colspan="5" class="text-right">消費税（10%）</td>
        <td class="text-right">&yen;{{ "{:,}".format(tax) }}</td>
        <td></td>
      </tr>
      <tr class="subtotal-row">
        <td colspan="5" class="text-right"><strong>合計</strong></td>
        <td class="text-right"><strong>&yen;{{ "{:,}".format(total) }}</strong></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="notes">
    <p><strong>備考</strong></p>
    <p>・上記金額には足場設置・撤去費用を含みます（別途記載がある場合を除く）</p>
    <p>・現地調査の結果、追加工事が必要な場合は事前にご相談の上、別途お見積りいたします</p>
    <p>・お支払い条件: 着工時50% / 完工時50%</p>
    {% if warranty %}
    <p>・保証: {{ warranty }}</p>
    {% endif %}
  </div>

  <div class="footer">
    <p>株式会社KAMO | 神奈川県知事 許可（般-24）第78388号 | kamo.soara-mu.jp</p>
  </div>
</body>
</html>
"""


def generate_estimate_pdf(
    client_name: str,
    project_name: str,
    location: str,
    items: list[dict],
    warranty: str = "",
    estimate_date: date | None = None,
) -> bytes:
    """見積書PDFを生成してbytesで返す。"""
    if estimate_date is None:
        from services.timezone_utils import today_jst
        estimate_date = today_jst()

    calc = calculate_estimate(items)
    html_content = Template(ESTIMATE_HTML_TEMPLATE).render(
        client_name=client_name,
        project_name=project_name,
        location=location,
        estimate_date=estimate_date.strftime("%Y年%m月%d日"),
        warranty=warranty,
        **calc,
    )
    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes
