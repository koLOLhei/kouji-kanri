"""完了報告書PDF自動生成サービス"""

from datetime import date
from jinja2 import Template
from weasyprint import HTML
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.project import Project
from models.phase import Phase
from models.photo import Photo
from models.daily_report import DailyReport
from models.inspection import Inspection


def generate_completion_report_pdf(project_id: str, db: Session) -> bytes:
    """完了報告書PDFを自動生成。工期・写真・検査結果・品質データをまとめる。"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("案件が見つかりません")

    phases = db.query(Phase).filter(Phase.project_id == project_id).order_by(Phase.order_index).all()
    total_photos = db.query(func.count(Photo.id)).filter(Photo.project_id == project_id).scalar() or 0
    total_reports = db.query(func.count(DailyReport.id)).filter(DailyReport.project_id == project_id).scalar() or 0
    avg_workers = db.query(func.avg(DailyReport.worker_count)).filter(
        DailyReport.project_id == project_id, DailyReport.worker_count.isnot(None)
    ).scalar()

    inspections = db.query(Inspection).filter(
        Inspection.project_id == project_id, Inspection.status == "completed"
    ).all()

    html = Template(COMPLETION_TEMPLATE).render(
        project=project,
        phases=phases,
        total_photos=total_photos,
        total_reports=total_reports,
        avg_workers=round(avg_workers, 1) if avg_workers else 0,
        inspections=inspections,
        work_days=total_reports,
    )
    return HTML(string=html).write_pdf()


COMPLETION_TEMPLATE = """
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8">
<style>
  body { font-family: "Hiragino Kaku Gothic Pro", sans-serif; font-size: 11px; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 22px; text-align: center; letter-spacing: 0.3em; font-weight: 300; margin-bottom: 40px; }
  .section { margin-bottom: 30px; }
  .section h2 { font-size: 13px; font-weight: 500; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px; margin-bottom: 12px; letter-spacing: 0.1em; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8f8f8; padding: 8px; text-align: left; font-weight: 500; border: 1px solid #ddd; }
  td { padding: 8px; border: 1px solid #ddd; }
  .stats { display: flex; gap: 20px; margin-bottom: 20px; }
  .stat { text-align: center; flex: 1; background: #f8f8f8; padding: 12px; }
  .stat-num { font-size: 24px; font-weight: 300; }
  .stat-label { font-size: 10px; color: #888; margin-top: 4px; }
  .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #aaa; }
</style>
</head>
<body>
  <h1>完 了 報 告 書</h1>

  <div class="section">
    <h2>工事概要</h2>
    <table>
      <tr><th width="25%">工事名称</th><td>{{ project.name }}</td></tr>
      <tr><th>工事場所</th><td>{{ project.location or '—' }}</td></tr>
      <tr><th>発注者</th><td>{{ project.client_name or '—' }}</td></tr>
      <tr><th>施工者</th><td>{{ project.contractor_name or '株式会社KAMO' }}</td></tr>
      <tr><th>工期</th><td>{{ project.start_date.strftime('%Y年%m月%d日') if project.start_date else '—' }} 〜 {{ project.end_date.strftime('%Y年%m月%d日') if project.end_date else '—' }}</td></tr>
      <tr><th>契約金額</th><td>{% if project.contract_amount %}&yen;{{ "{:,}".format(project.contract_amount) }}{% else %}—{% endif %}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>工事実績</h2>
    <div class="stats">
      <div class="stat"><div class="stat-num">{{ work_days }}</div><div class="stat-label">稼働日数</div></div>
      <div class="stat"><div class="stat-num">{{ avg_workers }}</div><div class="stat-label">平均作業員数</div></div>
      <div class="stat"><div class="stat-num">{{ total_photos }}</div><div class="stat-label">施工写真枚数</div></div>
      <div class="stat"><div class="stat-num">{{ inspections|length }}</div><div class="stat-label">検査実施回数</div></div>
    </div>
  </div>

  <div class="section">
    <h2>工程完了状況</h2>
    <table>
      <tr><th>工程名</th><th>状態</th></tr>
      {% for phase in phases %}
      <tr><td>{{ phase.name }}</td><td>{{ '完了' if phase.status == 'completed' else phase.status }}</td></tr>
      {% endfor %}
    </table>
  </div>

  {% if inspections %}
  <div class="section">
    <h2>検査結果</h2>
    <table>
      <tr><th>検査名</th><th>実施日</th><th>結果</th></tr>
      {% for insp in inspections %}
      <tr>
        <td>{{ insp.title }}</td>
        <td>{{ insp.actual_date.strftime('%Y/%m/%d') if insp.actual_date else '—' }}</td>
        <td>{{ insp.result or '—' }}</td>
      </tr>
      {% endfor %}
    </table>
  </div>
  {% endif %}

  <div class="section">
    <h2>品質管理</h2>
    <p>全工程の施工写真{{ total_photos }}枚をGPS・日時情報付きでデジタル記録し、SHA-256ハッシュによる改ざん防止証明を実施しました。</p>
  </div>

  <div class="footer">
    <p>株式会社KAMO | 神奈川県知事 許可（般-24）第78388号</p>
  </div>
</body>
</html>
"""
