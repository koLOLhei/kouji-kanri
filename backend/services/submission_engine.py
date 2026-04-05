"""Submission auto-generation engine."""

import uuid
from datetime import datetime
from io import BytesIO
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
import os
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


# ── テンプレートレジストリ ──────────────────────────────────────────────────
# template_type → { file, label_ja, label_en, category, required_fields }
TEMPLATE_REGISTRY: dict[str, dict[str, Any]] = {
    # 既存
    "process_completion": {
        "file": "process_completion.html",
        "label_ja": "工程完了報告書",
        "label_en": "Process Completion Report",
        "category": "general",
        "required_fields": ["project", "phase", "photos", "reports"],
    },
    # ── 協議・確認系 ──
    "kouji_uchiawasebo": {
        "file": "kouji_uchiawasebo.html",
        "label_ja": "工事打合簿",
        "label_en": "Construction Meeting Minutes",
        "category": "coordination",
        "required_fields": ["project", "meeting_date", "subject", "content"],
    },
    "dankai_kakuninsho": {
        "file": "dankai_kakuninsho.html",
        "label_ja": "段階確認書",
        "label_en": "Stage Confirmation Document",
        "category": "inspection",
        "required_fields": ["project", "work_type", "location", "stage_name", "check_items"],
    },
    "zairyo_kakuninsho": {
        "file": "zairyo_kakuninsho.html",
        "label_ja": "材料確認書",
        "label_en": "Material Confirmation Document",
        "category": "material",
        "required_fields": ["project", "materials", "confirmation_date"],
    },
    # ── 計画系 ──
    "sekou_keikakusho": {
        "file": "sekou_keikakusho.html",
        "label_ja": "施工計画書",
        "label_en": "Construction Plan",
        "category": "plan",
        "required_fields": ["project", "organization", "construction_method"],
    },
    "hinshitsu_kanrihyo": {
        "file": "hinshitsu_kanrihyo.html",
        "label_ja": "品質管理表",
        "label_en": "Quality Control Table",
        "category": "quality",
        "required_fields": ["project", "quality_items"],
    },
    "anzen_kanri_keikakusho": {
        "file": "anzen_kanri_keikakusho.html",
        "label_ja": "安全管理計画書",
        "label_en": "Safety Management Plan",
        "category": "safety",
        "required_fields": ["project", "safety_manager", "risk_assessments"],
    },
    # ── 体制系 ──
    "sekou_taisei_daicho": {
        "file": "sekou_taisei_daicho.html",
        "label_ja": "施工体制台帳",
        "label_en": "Construction Organization Ledger",
        "category": "organization",
        "required_fields": ["project", "subcontractors"],
    },
    "sekou_taikeizu": {
        "file": "sekou_taikeizu.html",
        "label_ja": "施工体系図",
        "label_en": "Construction Organization Chart",
        "category": "organization",
        "required_fields": ["project", "subcontractors"],
    },
    "shitauke_hensei": {
        "file": "shitauke_hensei.html",
        "label_ja": "下請負業者編成表",
        "label_en": "Subcontractor Organization Table",
        "category": "organization",
        "required_fields": ["project", "subcontractors"],
    },
    # ── 管理図・帳票 ──
    "dekigata_kanrizu": {
        "file": "dekigata_kanrizu.html",
        "label_ja": "出来形管理図",
        "label_en": "As-Built Management Chart",
        "category": "quality",
        "required_fields": ["project", "work_type", "measurements"],
    },
    "saisei_shigen": {
        "file": "saisei_shigen.html",
        "label_ja": "再生資源利用計画書",
        "label_en": "Recycled Resource Utilization Plan",
        "category": "environment",
        "required_fields": ["project", "recycled_materials", "waste_materials"],
    },
    "koteihyo": {
        "file": "koteihyo.html",
        "label_ja": "工程表",
        "label_en": "Schedule Chart",
        "category": "plan",
        "required_fields": ["project", "schedule_tasks"],
    },
    # ── 日常記録 ──
    "kouji_nisshi": {
        "file": "kouji_nisshi.html",
        "label_ja": "工事日誌",
        "label_en": "Construction Diary",
        "category": "daily",
        "required_fields": ["project", "diary_date", "weather_am", "weather_pm", "works"],
    },
    "kouji_shashincho": {
        "file": "kouji_shashincho.html",
        "label_ja": "工事写真帳",
        "label_en": "Construction Photo Album",
        "category": "photo",
        "required_fields": ["project", "photos"],
    },
    # ── 出来高・検査 ──
    "dekidaka_houkokusho": {
        "file": "dekidaka_houkokusho.html",
        "label_ja": "出来高報告書",
        "label_en": "Progress Payment Report",
        "category": "payment",
        "required_fields": ["project", "report_period_start", "report_period_end", "progress_items"],
    },
    "kensa_kiroku": {
        "file": "kensa_kiroku.html",
        "label_ja": "検査記録",
        "label_en": "Inspection Record",
        "category": "inspection",
        "required_fields": ["project", "inspection_type", "inspection_date", "inspection_items"],
    },
    # ── 是正・NCR ──
    "zesei_sochi": {
        "file": "zesei_sochi.html",
        "label_ja": "是正措置報告書（NCR）",
        "label_en": "Corrective Action Report (NCR)",
        "category": "quality",
        "required_fields": ["project", "nonconformity_description", "root_cause", "corrective_actions"],
    },
    # ── 安全系 ──
    "anzen_junkai": {
        "file": "anzen_junkai.html",
        "label_ja": "安全巡回記録",
        "label_en": "Safety Patrol Record",
        "category": "safety",
        "required_fields": ["project", "patrol_datetime", "patrol_by", "check_items"],
    },
    "shinki_nyujousha": {
        "file": "shinki_nyujousha.html",
        "label_ja": "新規入場者教育記録",
        "label_en": "New Worker Orientation Record",
        "category": "safety",
        "required_fields": ["project", "education_datetime", "attendees"],
    },
    "ky_katsudo": {
        "file": "ky_katsudo.html",
        "label_ja": "KY活動記録",
        "label_en": "KY Activity Record",
        "category": "safety",
        "required_fields": ["project", "activity_date", "work_group", "leader"],
    },
    "hiyarihatto": {
        "file": "hiyarihatto.html",
        "label_ja": "ヒヤリハット報告書",
        "label_en": "Near-Miss Report",
        "category": "safety",
        "required_fields": ["project", "incident_datetime", "reporter_name", "incident_description"],
    },
    # ── 廃棄物 ──
    "sanpai_kanrihyo": {
        "file": "sanpai_kanrihyo.html",
        "label_ja": "産業廃棄物管理票（マニフェスト）",
        "label_en": "Waste Manifest",
        "category": "environment",
        "required_fields": ["project", "wastes", "transporter_name", "disposer_name"],
    },
    # ── 材料試験 ──
    "zairyo_shiken": {
        "file": "zairyo_shiken.html",
        "label_ja": "材料試験成績書",
        "label_en": "Material Test Results",
        "category": "quality",
        "required_fields": ["project", "material_name", "test_items"],
    },
    "concrete_dasetsu": {
        "file": "concrete_dasetsu.html",
        "label_ja": "コンクリート打設記録",
        "label_en": "Concrete Placement Record",
        "category": "quality",
        "required_fields": ["project", "placement_date", "placement_location", "fresh_tests"],
    },
    "haikin_kensa": {
        "file": "haikin_kensa.html",
        "label_ja": "配筋検査記録",
        "label_en": "Rebar Inspection Record",
        "category": "inspection",
        "required_fields": ["project", "inspection_date", "inspection_location", "main_bars"],
    },
    "tekko_kensa": {
        "file": "tekko_kensa.html",
        "label_ja": "鉄骨工事検査記録",
        "label_en": "Steel Structure Inspection Record",
        "category": "inspection",
        "required_fields": ["project", "inspection_date", "inspection_location", "steel_materials"],
    },
    "bosui_kensa": {
        "file": "bosui_kensa.html",
        "label_ja": "防水工事検査記録",
        "label_en": "Waterproofing Inspection Record",
        "category": "inspection",
        "required_fields": ["project", "inspection_date", "waterproof_method", "materials"],
    },
    # ── 変更・完成 ──
    "sekkei_henko": {
        "file": "sekkei_henko.html",
        "label_ja": "設計変更協議書",
        "label_en": "Design Change Consultation",
        "category": "change",
        "required_fields": ["project", "change_reason", "change_items"],
    },
    "kouji_kansei": {
        "file": "kouji_kansei.html",
        "label_ja": "工事完成届",
        "label_en": "Construction Completion Notice",
        "category": "completion",
        "required_fields": ["project", "actual_completion_date", "main_work_content"],
    },
    "hikiwatashi": {
        "file": "hikiwatashi.html",
        "label_ja": "引渡書",
        "label_en": "Handover Document",
        "category": "completion",
        "required_fields": ["project", "handover_date", "actual_completion_date"],
    },
}


def generate_document(
    template_type: str,
    context_data: dict[str, Any],
    db: Session,
) -> bytes:
    """
    テンプレート種別とコンテキストデータを受け取りHTML（またはPDF）バイト列を返す。

    Args:
        template_type: TEMPLATE_REGISTRY のキー
        context_data: Jinja2テンプレートに渡す変数辞書
        db: DBセッション（project / photos 等の補完に使用）

    Returns:
        bytes: WeasyPrintが利用可能なら PDF バイト列、それ以外は HTML バイト列
    """
    entry = TEMPLATE_REGISTRY.get(template_type)
    if not entry:
        raise ValueError(f"未知のテンプレート種別: {template_type}")

    # project_id からプロジェクトを補完
    if "project" not in context_data and "project_id" in context_data:
        project = db.query(Project).filter_by(id=context_data["project_id"]).first()
        if not project:
            raise ValueError("案件が見つかりません")
        context_data["project"] = project

    # 生成日時を自動付与
    context_data.setdefault("generated_at", datetime.utcnow())

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
        return HTML(string=html_content).write_pdf()
    except ImportError:
        return html_content.encode("utf-8")


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
