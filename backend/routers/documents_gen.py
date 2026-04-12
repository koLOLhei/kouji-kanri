"""汎用書類生成ルーター — 30種類以上の政府書類テンプレートを提供"""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.submission_engine import TEMPLATE_REGISTRY, generate_document
from services.storage_service import upload_file, generate_upload_key, generate_presigned_url

router = APIRouter(tags=["documents-gen"])


# ── スキーマ ─────────────────────────────────────────────────────────────────

class GenerateDocumentRequest(BaseModel):
    """書類生成リクエスト"""
    template_type: str = Field(..., description="TEMPLATE_REGISTRY のキー")
    context_data: dict[str, Any] = Field(
        default_factory=dict,
        description="テンプレート変数（project_id 以外のフィールド）",
    )
    output_format: str = Field(
        default="pdf",
        description="出力形式: 'pdf' | 'html'",
    )
    save_to_storage: bool = Field(
        default=True,
        description="ストレージ（S3/ローカル）に保存するか",
    )


class GenerateDocumentResponse(BaseModel):
    document_id: str
    template_type: str
    label_ja: str
    label_en: str
    file_key: str | None = None
    download_url: str | None = None
    generated_at: datetime
    content_type: str


class TemplateInfo(BaseModel):
    template_type: str
    label_ja: str
    label_en: str
    category: str
    file: str
    required_fields: list[str]


class TemplateFieldsResponse(BaseModel):
    template_type: str
    label_ja: str
    required_fields: list[str]
    optional_fields: list[str]
    description: str


# ── テンプレート一覧・フィールド情報 ────────────────────────────────────────

@router.get(
    "/api/documents/templates",
    response_model=list[TemplateInfo],
    summary="利用可能なテンプレート一覧",
)
def list_templates(
    category: str | None = None,
    user: User = Depends(get_current_user),
):
    """
    利用可能な書類テンプレートをすべて返す。
    `category` クエリパラメーターで絞り込み可能。
    """
    result = []
    for template_type, info in TEMPLATE_REGISTRY.items():
        if category and info.get("category") != category:
            continue
        result.append(TemplateInfo(
            template_type=template_type,
            label_ja=info["label_ja"],
            label_en=info["label_en"],
            category=info.get("category", "general"),
            file=info["file"],
            required_fields=info.get("required_fields", []),
        ))
    return result


@router.get(
    "/api/documents/templates/{template_type}/fields",
    response_model=TemplateFieldsResponse,
    summary="テンプレートの必須フィールド情報",
)
def get_template_fields(
    template_type: str,
    user: User = Depends(get_current_user),
):
    """テンプレートが必要とするフィールドと説明を返す"""
    info = TEMPLATE_REGISTRY.get(template_type)
    if not info:
        raise HTTPException(status_code=404, detail=f"テンプレートが見つかりません: {template_type}")

    # カテゴリー別の一般的なオプションフィールドを返す
    optional_fields_map: dict[str, list[str]] = {
        "coordination": ["meeting_number", "issuer_type", "meeting_type", "response", "response_date", "attachments"],
        "inspection": ["overall_result", "correction_items", "notes", "correction_deadline"],
        "plan": ["notes", "submission_date", "doc_version"],
        "quality": ["notes", "overall_result", "applicable_spec"],
        "safety": ["notes", "weather", "emergency_hospital", "emergency_hospital_tel"],
        "organization": ["notes", "creation_date", "contractor_license"],
        "daily": ["instructions", "notes", "ky_done", "morning_meeting_done", "safety_patrol_done"],
        "photo": ["notes"],
        "payment": ["notes", "months", "planned_rates", "actual_rates"],
        "environment": ["notes", "creation_date"],
        "material": ["notes", "quality_docs"],
        "change": ["notes", "agreement_result", "agreement_date", "agreement_comments"],
        "completion": ["notes", "tax_amount", "handover_documents"],
        "general": ["notes", "doc_version"],
    }
    category = info.get("category", "general")
    optional_fields = optional_fields_map.get(category, optional_fields_map["general"])

    return TemplateFieldsResponse(
        template_type=template_type,
        label_ja=info["label_ja"],
        required_fields=info.get("required_fields", []),
        optional_fields=optional_fields,
        description=(
            f"{info['label_ja']}（{info['label_en']}）のテンプレートです。"
            f"カテゴリー: {category}。"
            f"ファイル: {info['file']}。"
        ),
    )


# ── プロジェクト単位の書類生成 ──────────────────────────────────────────────

@router.post(
    "/api/projects/{project_id}/documents/generate",
    response_model=GenerateDocumentResponse,
    summary="書類生成（プロジェクト配下）",
)
def generate_project_document(
    project_id: str,
    req: GenerateDocumentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """
    指定したプロジェクトの任意の書類テンプレートを生成し、
    ストレージに保存してダウンロードURLを返す。
    """
    # プロジェクト存在確認
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    info = TEMPLATE_REGISTRY.get(req.template_type)
    if not info:
        raise HTTPException(
            status_code=400,
            detail=f"未知のテンプレート種別: {req.template_type}。"
                   f"利用可能: {list(TEMPLATE_REGISTRY.keys())}",
        )

    # context_data にプロジェクトを注入
    context = dict(req.context_data)
    context["project"] = project
    context["project_id"] = project_id

    try:
        file_bytes, content_type, ext = generate_document(req.template_type, context, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"書類生成に失敗しました: {e}")

    # ストレージへ保存
    doc_id = str(uuid.uuid4())

    file_key = None
    download_url = None
    if req.save_to_storage:
        file_key = generate_upload_key(
            user.tenant_id, project_id, "generated_docs",
            f"{req.template_type}_{doc_id[:8]}{ext}",
        )
        try:
            upload_file(file_bytes, file_key, content_type)
            download_url = generate_presigned_url(file_key)
        except Exception:
            # ストレージ保存失敗は警告のみ（返答は継続）
            file_key = None

    return GenerateDocumentResponse(
        document_id=doc_id,
        template_type=req.template_type,
        label_ja=info["label_ja"],
        label_en=info["label_en"],
        file_key=file_key,
        download_url=download_url,
        generated_at=datetime.now(timezone.utc),
        content_type=content_type,
    )


@router.post(
    "/api/projects/{project_id}/documents/generate/preview",
    summary="書類プレビュー（HTMLを直接返す）",
    response_class=Response,
)
def preview_project_document(
    project_id: str,
    req: GenerateDocumentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """
    書類をHTML形式でブラウザに直接返す（プレビュー用）。
    ストレージには保存しない。
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    info = TEMPLATE_REGISTRY.get(req.template_type)
    if not info:
        raise HTTPException(status_code=400, detail=f"未知のテンプレート種別: {req.template_type}")

    context = dict(req.context_data)
    context["project"] = project
    context["project_id"] = project_id

    # プレビューは常にHTML
    from jinja2 import Template
    from services.submission_engine import jinja_env
    try:
        tmpl = jinja_env.get_template(info["file"])
        context.setdefault("generated_at", datetime.now(timezone.utc))
        html_content = tmpl.render(**context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"テンプレート描画に失敗しました: {e}")

    return Response(
        content=html_content,
        media_type="text/html; charset=utf-8",
    )


@router.get(
    "/api/projects/{project_id}/documents/categories",
    summary="書類カテゴリー一覧（プロジェクト配下）",
)
def list_document_categories(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """利用可能な書類カテゴリーと、そのカテゴリーに属するテンプレートの数を返す"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == user.tenant_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    category_labels = {
        "coordination": "協議・確認",
        "inspection": "検査",
        "plan": "計画",
        "quality": "品質管理",
        "safety": "安全管理",
        "organization": "施工体制",
        "daily": "日常記録",
        "photo": "写真",
        "payment": "出来高・支払",
        "environment": "環境・廃棄物",
        "material": "材料",
        "change": "設計変更",
        "completion": "完成・引渡",
        "general": "その他",
    }

    categories: dict[str, dict] = {}
    for template_type, info in TEMPLATE_REGISTRY.items():
        cat = info.get("category", "general")
        if cat not in categories:
            categories[cat] = {
                "category": cat,
                "label_ja": category_labels.get(cat, cat),
                "count": 0,
                "templates": [],
            }
        categories[cat]["count"] += 1
        categories[cat]["templates"].append({
            "template_type": template_type,
            "label_ja": info["label_ja"],
        })

    return {
        "project_id": project_id,
        "categories": list(categories.values()),
        "total_templates": len(TEMPLATE_REGISTRY),
    }
