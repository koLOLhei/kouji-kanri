"""Submission auto-generation engine."""

import uuid
from datetime import datetime, timezone
from typing import Any

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from models.phase import Phase, PhaseRequirement
from models.photo import Photo
from models.report import Report
from models.submission import Submission, DocumentTemplate
from models.project import Project
from services.storage_service import upload_file, generate_upload_key

# Jinja2 template environment
# autoescape=True で全変数を自動エスケープ (XSS対策)。明示的に HTML を出力したい箇所は |safe を使う。
import os
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=True,
)


# テンプレートレジストリは services/template_registry.py に分離
from services.template_registry import TEMPLATE_REGISTRY



def generate_document(
    template_type: str,
    context_data: dict[str, Any],
    db: Session,
) -> tuple[bytes, str, str]:
    """
    テンプレート種別とコンテキストデータを受け取り (bytes, content_type, extension) タプルを返す。

    Args:
        template_type: TEMPLATE_REGISTRY のキー
        context_data: Jinja2テンプレートに渡す変数辞書
        db: DBセッション（project / photos 等の補完に使用）

    Returns:
        tuple[bytes, str, str]:
            - bytes: 生成されたファイルのバイト列 (PDF または HTML)
            - str: MIME content-type ("application/pdf" or "text/html")
            - str: ファイル拡張子 (".pdf" or ".html")

    WeasyPrintが利用可能なら PDF を、インポートできない場合は UTF-8 HTML バイト列を返す。
    呼び出し元は content_type / extension を使ってレスポンスを構築すること。
    """
    entry = TEMPLATE_REGISTRY.get(template_type)
    if not entry:
        raise ValueError(f"未知のテンプレート種別: {template_type}")

    # レジストリの default_context を context_data に注入 (上書きしない)
    for k, v in entry.get("default_context", {}).items():
        context_data.setdefault(k, v)

    # 工種別の標準データを注入 (work_type が確定したあとで)
    work_type = context_data.get("work_type")
    if work_type:
        from services.work_type_defaults import get_work_type_defaults
        wt_defaults = get_work_type_defaults(work_type)
        # materials / construction_flow / inspection_items が未指定なら標準を充てる
        for key, value in wt_defaults.items():
            context_data.setdefault(key, value)

    # project_id からプロジェクトを補完
    if "project" not in context_data and "project_id" in context_data:
        project = db.query(Project).filter_by(id=context_data["project_id"]).first()
        if not project:
            raise ValueError("案件が見つかりません")
        context_data["project"] = project

    # 生成日時を自動付与
    context_data.setdefault("generated_at", datetime.now(timezone.utc))

    # DBテンプレートを優先、なければファイルから
    db_template = db.query(DocumentTemplate).filter_by(
        template_type=template_type, is_active=True
    ).first()

    if db_template:
        from jinja2 import Template
        tmpl = Template(db_template.html_template)
    else:
        tmpl = jinja_env.get_template(entry["file"])

    html_content = tmpl.render(**context_data)

    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes, "application/pdf", ".pdf"
    except (ImportError, Exception) as exc:
        # WeasyPrint unavailable (system deps missing) or rendering error.
        # Return a self-contained, print-ready HTML page the user can
        # open in a browser and use File→Print→Save as PDF.
        import logging
        logging.getLogger(__name__).warning("[pdf] WeasyPrint unavailable (%s) — returning HTML fallback", exc)
        print_html = _wrap_printable_html(html_content)
        return print_html.encode("utf-8"), "text/html; charset=utf-8", ".html"


def _wrap_printable_html(inner_html: str) -> str:
    """Wrap rendered template HTML in a self-contained print-ready document.

    If the inner HTML already starts with <!DOCTYPE, return it as-is (the
    template itself is a full document).  Otherwise wrap it so the browser
    can render it directly and the user can print-to-PDF.
    """
    stripped = inner_html.lstrip()
    if stripped.lower().startswith("<!doctype") or stripped.lower().startswith("<html"):
        # Full document — inject print instruction banner if not present
        banner = (
            '<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px 20px;'
            'margin:0 0 16px 0;font-family:sans-serif;font-size:14px;border-radius:4px;">'
            '&#x1F4BE; このページをPDFとして保存するには: ブラウザメニュー → <strong>印刷</strong> → '
            '保存先を <strong>「PDFに保存」</strong> に選択してください。</div>'
        )
        return stripped.replace("<body>", f"<body>{banner}", 1) if "<body>" in stripped else stripped
    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>工事書類</title>
<style>
  /* ── Reset ── */
  *, *::before, *::after {{ box-sizing: border-box; }}
  body {{
    font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif;
    font-size: 11pt;
    color: #111;
    margin: 0;
    padding: 0;
    background: #f8fafc;
  }}
  /* ── Print instruction banner (screen only) ── */
  .print-banner {{
    background: #fef3c7;
    border: 1px solid #f59e0b;
    padding: 12px 20px;
    font-size: 13px;
    text-align: center;
    border-radius: 4px;
    margin: 16px auto;
    max-width: 860px;
  }}
  @media print {{
    .print-banner {{ display: none; }}
    body {{ background: white; }}
    .page-wrap {{ box-shadow: none; margin: 0; padding: 0; max-width: 100%; }}
  }}
  /* ── Document wrapper ── */
  .page-wrap {{
    max-width: 860px;
    margin: 24px auto;
    background: white;
    padding: 48px 56px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    border-radius: 4px;
  }}
  /* ── Typography ── */
  h1 {{ font-size: 18pt; margin: 0 0 16px; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }}
  h2 {{ font-size: 13pt; margin: 24px 0 8px; border-left: 4px solid #1e40af; padding-left: 8px; }}
  h3 {{ font-size: 11pt; margin: 16px 0 4px; }}
  table {{
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 10pt;
  }}
  th, td {{
    border: 1px solid #cbd5e1;
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }}
  th {{ background: #f1f5f9; font-weight: 600; }}
  img {{ max-width: 100%; height: auto; }}
  .label {{ font-weight: 600; color: #374151; }}
  .value {{ color: #111; }}
  dl {{ display: grid; grid-template-columns: 140px 1fr; gap: 4px 12px; margin: 8px 0; }}
  dt {{ font-weight: 600; color: #374151; }}
  dd {{ margin: 0; }}
  footer {{ margin-top: 48px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #6b7280; }}
</style>
</head>
<body>
<div class="print-banner">
  &#x1F4BE; このページをPDFとして保存するには:
  ブラウザメニュー &rarr; <strong>印刷</strong> &rarr;
  保存先を <strong>「PDFに保存」</strong> に選択してください。
</div>
<div class="page-wrap">
{inner_html}
</div>
</body>
</html>"""


def check_phase_completeness(db: Session, phase_id: str) -> dict:
    """工程の全要件充足状況をチェック"""
    requirements = db.query(PhaseRequirement).filter_by(phase_id=phase_id).all()
    results = []
    for req in requirements:
        if req.requirement_type == "photo":
            count = db.query(Photo).filter_by(requirement_id=req.id).count()
        elif req.requirement_type in ("report", "test_result"):
            count = db.query(Report).filter_by(
                requirement_id=req.id, status="approved"
            ).count()
        else:
            count = db.query(Report).filter_by(requirement_id=req.id).count()
        results.append({
            "requirement_id": req.id,
            "name": req.name,
            "type": req.requirement_type,
            "min_count": req.min_count,
            "current_count": count,
            "fulfilled": count >= req.min_count,
            "is_mandatory": req.is_mandatory,
        })

    mandatory = [r for r in results if r["is_mandatory"]]
    all_met = all(r["fulfilled"] for r in mandatory) if mandatory else False
    return {
        "complete": all_met,
        "total": len(results),
        "fulfilled": sum(1 for r in results if r["fulfilled"]),
        "details": results,
    }


def auto_generate_if_ready(db: Session, phase_id: str, tenant_id: str) -> Submission | None:
    """写真アップロードまたは報告書承認後に自動呼び出し"""
    check = check_phase_completeness(db, phase_id)
    if not check["complete"]:
        return None

    # 既にdraftがあればスキップ
    existing = db.query(Submission).filter_by(
        phase_id=phase_id, status="draft"
    ).first()
    if existing:
        return existing

    return generate_submission_package(db, phase_id, tenant_id)


def generate_submission_package(
    db: Session, phase_id: str, tenant_id: str,
    submission_type: str = "process_completion"
) -> Submission:
    """提出書類パッケージを生成"""
    phase = db.query(Phase).filter_by(id=phase_id).first()
    if not phase:
        raise ValueError("工程が見つかりません")

    project = db.query(Project).filter_by(id=phase.project_id).first()
    if not project:
        raise ValueError("案件が見つかりません")

    # 写真と報告書を取得
    photos = db.query(Photo).filter_by(phase_id=phase_id).order_by(Photo.created_at).all()
    reports = db.query(Report).filter_by(phase_id=phase_id, status="approved").all()

    # テンプレート選択 (地域優先 → デフォルト)
    template = db.query(DocumentTemplate).filter_by(
        template_type=submission_type,
        region=project.regional_spec,
        is_active=True,
    ).first()
    if not template:
        template = db.query(DocumentTemplate).filter_by(
            template_type=submission_type,
            region=None,
            is_active=True,
        ).first()

    # HTMLレンダリング
    if template:
        from jinja2 import Template
        tmpl = Template(template.html_template)
    else:
        tmpl = jinja_env.get_template(f"{submission_type}.html")

    html_content = tmpl.render(
        project=project,
        phase=phase,
        photos=photos,
        reports=reports,
        generated_at=datetime.now(timezone.utc),
    )

    # PDF生成
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        file_ext = ".pdf"
        file_mime = "application/pdf"
    except (ImportError, Exception) as exc:
        import logging
        logging.getLogger(__name__).warning("[pdf] WeasyPrint unavailable (%s) — storing HTML fallback", exc)
        pdf_bytes = _wrap_printable_html(html_content).encode("utf-8")
        file_ext = ".html"
        file_mime = "text/html"

    # S3にアップロード
    key = generate_upload_key(
        tenant_id, project.id, "submissions",
        f"{submission_type}_{phase.phase_code or phase.id}{file_ext}"
    )
    upload_file(pdf_bytes, key, file_mime)

    # DB保存
    submission = Submission(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase_id,
        submission_type=submission_type,
        title=f"{phase.name} - {submission_type}",
        file_key=key,
        status="ready",
        generated_at=datetime.now(timezone.utc),
        metadata_json={
            "photo_ids": [p.id for p in photos],
            "report_ids": [r.id for r in reports],
        },
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission
