"""写真台帳PDF自動生成サービス

工種別に写真を並べ、黒板情報（工事名・工種・撮影日・位置）を付けたA4帳票を生成。
公共工事の電子納品・紙提出の両方に対応。
"""

from datetime import datetime
from jinja2 import Template
from weasyprint import HTML
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.photo import Photo
from models.project import Project
from services.storage_service import generate_presigned_url


def generate_photo_ledger_pdf(project_id: str, db: Session, category: str | None = None) -> bytes:
    """写真台帳PDFを生成。

    Args:
        project_id: 案件ID
        db: DBセッション
        category: 写真区分でフィルター（None=全件）
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("案件が見つかりません")

    q = db.query(Photo).filter(Photo.project_id == project_id)
    if category:
        q = q.filter(Photo.photo_category == category)
    photos = q.order_by(Photo.created_at).all()

    if not photos:
        raise ValueError("写真が見つかりません")

    # 写真を工種別にグループ化
    groups: dict[str, list] = {}
    for p in photos:
        key = p.work_type or p.photo_category or "未分類"
        if key not in groups:
            groups[key] = []
        groups[key].append({
            "id": p.id,
            "caption": p.caption or "",
            "taken_at": p.taken_at.strftime("%Y/%m/%d %H:%M") if p.taken_at else "",
            "work_type": p.work_type or "",
            "work_subtype": p.work_subtype or "",
            "work_detail": p.work_detail or "",
            "photo_category": p.photo_category or "",
            "photo_number": p.photo_number or "",
            "gps_lat": p.gps_lat,
            "gps_lng": p.gps_lng,
            "url": generate_presigned_url(p.thumbnail_key or p.file_key) if (p.thumbnail_key or p.file_key) else None,
            "checksum": (p.checksum or "")[:16],
        })

    html = Template(LEDGER_TEMPLATE).render(
        project=project,
        groups=groups,
        total_photos=len(photos),
        generated_at=datetime.now().strftime("%Y年%m月%d日"),
    )
    return HTML(string=html).write_pdf()


LEDGER_TEMPLATE = """
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: "Hiragino Kaku Gothic Pro", sans-serif; font-size: 9px; color: #1a1a1a; margin: 0; }
  .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
  .header h1 { font-size: 16px; font-weight: 500; letter-spacing: 0.3em; margin: 0 0 4px; }
  .header-info { font-size: 9px; color: #666; }
  .group-title { font-size: 12px; font-weight: 500; background: #1a1a1a; color: white; padding: 6px 12px; margin: 15px 0 8px; letter-spacing: 0.1em; page-break-after: avoid; }
  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .photo-card { border: 1px solid #ddd; padding: 6px; page-break-inside: avoid; }
  .photo-img { width: 100%; height: 120px; object-fit: cover; background: #f0f0f0; display: block; }
  .photo-img-placeholder { width: 100%; height: 120px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 10px; }
  .blackboard { background: #2d5016; color: white; padding: 6px 8px; font-size: 8px; line-height: 1.6; margin-top: 4px; }
  .blackboard .title { font-weight: 500; font-size: 9px; margin-bottom: 2px; }
  .blackboard table { width: 100%; border-collapse: collapse; }
  .blackboard td { padding: 1px 4px; vertical-align: top; }
  .blackboard .label { color: #b0d090; width: 50px; }
  .photo-meta { font-size: 7px; color: #999; margin-top: 2px; }
  .footer { text-align: center; font-size: 8px; color: #aaa; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 8px; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<div class="header">
  <h1>工 事 写 真 台 帳</h1>
  <div class="header-info">
    工事名: {{ project.name }} | 工事番号: {{ project.project_code or '—' }} | 写真枚数: {{ total_photos }}枚 | 出力日: {{ generated_at }}
  </div>
</div>

{% for group_name, photos in groups.items() %}
<div class="group-title">{{ group_name }}（{{ photos|length }}枚）</div>
<div class="photo-grid">
  {% for photo in photos %}
  <div class="photo-card">
    {% if photo.url %}
    <img class="photo-img" src="{{ photo.url }}" alt="{{ photo.caption }}">
    {% else %}
    <div class="photo-img-placeholder">写真データなし</div>
    {% endif %}

    <div class="blackboard">
      <div class="title">{{ project.name }}</div>
      <table>
        <tr><td class="label">工種</td><td>{{ photo.work_type }} {{ photo.work_subtype }}</td></tr>
        <tr><td class="label">撮影日</td><td>{{ photo.taken_at }}</td></tr>
        <tr><td class="label">説明</td><td>{{ photo.caption }}</td></tr>
        {% if photo.gps_lat and photo.gps_lng %}
        <tr><td class="label">位置</td><td>{{ "%.5f"|format(photo.gps_lat) }}, {{ "%.5f"|format(photo.gps_lng) }}</td></tr>
        {% endif %}
      </table>
    </div>
    <div class="photo-meta">
      No.{{ photo.photo_number }} | {{ photo.photo_category }} | Hash: {{ photo.checksum }}...
    </div>
  </div>
  {% endfor %}
</div>
{% endfor %}

<div class="footer">
  株式会社KAMO | 施工管理システム自動生成 | 全写真SHA-256ハッシュ記録済み
</div>

</body>
</html>
"""
