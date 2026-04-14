"""保証書PDF自動生成サービス — クリアコート10年保証等。"""

from datetime import date
from dateutil.relativedelta import relativedelta
from jinja2 import Template
from weasyprint import HTML


def generate_warranty_pdf(
    client_name: str,
    project_name: str,
    location: str,
    work_description: str,
    warranty_years: int = 10,
    completion_date: date | None = None,
) -> bytes:
    """保証書PDFを生成。"""
    from services.timezone_utils import today_jst
    if completion_date is None:
        completion_date = today_jst()
    expiry_date = completion_date + relativedelta(years=warranty_years)

    html = Template(WARRANTY_TEMPLATE).render(
        client_name=client_name,
        project_name=project_name,
        location=location,
        work_description=work_description,
        warranty_years=warranty_years,
        completion_date=completion_date.strftime("%Y年%m月%d日"),
        expiry_date=expiry_date.strftime("%Y年%m月%d日"),
    )
    return HTML(string=html).write_pdf()


WARRANTY_TEMPLATE = """
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8">
<style>
  body { font-family: "Hiragino Kaku Gothic Pro", sans-serif; color: #1a1a1a; margin: 60px; }
  .border { border: 2px solid #1a1a1a; padding: 50px; }
  h1 { font-size: 30px; text-align: center; letter-spacing: 0.5em; font-weight: 300; margin-bottom: 40px; }
  .subtitle { text-align: center; font-size: 10px; color: #888; letter-spacing: 0.2em; margin-bottom: 50px; }
  .content { font-size: 13px; line-height: 2.2; }
  .content p { margin-bottom: 16px; }
  .info-table { width: 80%; margin: 30px auto; border-collapse: collapse; }
  .info-table th { text-align: left; padding: 10px 16px; font-weight: 500; border-bottom: 1px solid #eee; width: 30%; font-size: 12px; }
  .info-table td { padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 12px; }
  .stamp { width: 100px; height: 100px; border: 1px solid #ccc; border-radius: 50%; margin: 40px auto 0; display: flex; align-items: center; justify-content: center; }
  .stamp-text { font-size: 10px; color: #ccc; text-align: center; }
  .company { text-align: right; margin-top: 40px; font-size: 12px; line-height: 1.8; }
  .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #aaa; }
</style>
</head>
<body>
  <div class="border">
    <h1>保 証 書</h1>
    <p class="subtitle">WARRANTY CERTIFICATE</p>

    <div class="content">
      <p style="text-align:center; font-size: 15px; margin-bottom: 30px;">{{ client_name }} 様</p>

      <p>
        下記の工事につきまして、完工後 <strong>{{ warranty_years }}年間</strong> の品質保証をいたします。
        保証期間中に施工の瑕疵に起因する不具合が発生した場合、無償にて補修いたします。
      </p>
    </div>

    <table class="info-table">
      <tr><th>工事名称</th><td>{{ project_name }}</td></tr>
      <tr><th>工事場所</th><td>{{ location }}</td></tr>
      <tr><th>工事内容</th><td>{{ work_description }}</td></tr>
      <tr><th>完工日</th><td>{{ completion_date }}</td></tr>
      <tr><th>保証期間</th><td>{{ completion_date }} 〜 {{ expiry_date }}（{{ warranty_years }}年間）</td></tr>
    </table>

    <div class="content" style="margin-top: 30px;">
      <p style="font-size: 11px; color: #666;">
        ただし、以下の場合は保証の対象外とさせていただきます。<br>
        ・天災地変（地震・台風・洪水等）による損傷<br>
        ・施工箇所への第三者による加工・改変<br>
        ・通常の経年劣化を超えない範囲の変色・退色<br>
        ・建物の構造に起因する不具合
      </p>
    </div>

    <div class="company">
      <p><strong>株式会社KAMO</strong></p>
      <p>代表取締役 鴨田浩志</p>
      <p>〒213-0013 神奈川県川崎市高津区末長1-52-37-104</p>
      <p>TEL: 044-948-9115</p>
      <p>神奈川県知事 許可（般-24）第78388号</p>
    </div>

    <div class="stamp"><div class="stamp-text">印</div></div>
  </div>

  <div class="footer">
    <p>本保証書は施工品質に対する保証であり、保証書記載の条件に基づきます。</p>
  </div>
</body>
</html>
"""
