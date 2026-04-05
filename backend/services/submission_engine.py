"""Submission auto-generation engine."""

import uuid
from datetime import datetime
from io import BytesIO

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from models.phase import Phase, PhaseRequirement
from models.photo import Photo
from models.report import Report
from models.submission import Submission, DocumentTemplate
from models.project import Project
from services.storage_service import upload_file, generate_upload_key

# Jinja2 template environment
import os
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


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
        generated_at=datetime.utcnow(),
    )

    # PDF生成
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
    except ImportError:
        pdf_bytes = html_content.encode("utf-8")

    # S3にアップロード
    key = generate_upload_key(
        tenant_id, project.id, "submissions",
        f"{submission_type}_{phase.phase_code or phase.id}.pdf"
    )
    upload_file(pdf_bytes, key, "application/pdf")

    # DB保存
    submission = Submission(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase_id,
        submission_type=submission_type,
        title=f"{phase.name} - {submission_type}",
        file_key=key,
        status="ready",
        generated_at=datetime.utcnow(),
        metadata_json={
            "photo_ids": [p.id for p in photos],
            "report_ids": [r.id for r in reports],
        },
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission
