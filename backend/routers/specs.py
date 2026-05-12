"""Specification browser router."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models.spec import SpecChapter, RegionalOverride, SpecContent
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/specs", tags=["specs"])


SPEC_REGISTRY = {
    "kokyo_r4": "公共建築工事標準仕様書（建築工事編）令和4年版",
    "kaisyu_r2": "建築改修工事特記仕様書（令和2年4月版）",
    "yokohama_estimate": "建築工事積算マニュアル（横浜市）",
    "kokyo_r7": "公共建築工事標準仕様書 令和7年版（章構成のみ）",
}


@router.get("/chapters")
def list_chapters(
    spec_code: str = "kokyo_r7",
    chapter: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(SpecChapter).filter(SpecChapter.spec_code == spec_code)
    if chapter:
        q = q.filter(SpecChapter.chapter_number == chapter)
    chapters = q.order_by(SpecChapter.sort_order).all()
    return [
        {
            "id": c.id, "chapter_number": c.chapter_number,
            "section_number": c.section_number, "title": c.title,
            "required_documents": c.required_documents or [],
        }
        for c in chapters
    ]


@router.get("/regions")
def list_regions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    regions = db.query(RegionalOverride.region).distinct().all()
    return [r[0] for r in regions]


@router.get("/list")
def list_specs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """取り込み済みPDF仕様書の一覧。"""
    result = []
    for spec_code, label in SPEC_REGISTRY.items():
        count = db.query(SpecContent).filter(SpecContent.spec_code == spec_code).count()
        result.append({
            "spec_code": spec_code,
            "label": label,
            "page_count": count,
            "ingested": count > 0,
        })
    return result


@router.get("/search")
def search_spec_content(
    q: str = Query(..., min_length=2, description="検索キーワード"),
    spec_code: str | None = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PDF仕様書の全文検索 (LIKE/部分一致)。

    日本語フルテキスト検索の精度は限定的だが、専門用語の部分一致で実用可能。
    """
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="クエリは2文字以上必要")

    query = db.query(SpecContent).filter(
        or_(
            SpecContent.body_text.ilike(f"%{q}%"),
            SpecContent.title.ilike(f"%{q}%"),
            SpecContent.chapter.ilike(f"%{q}%"),
            SpecContent.section.ilike(f"%{q}%"),
        )
    )
    if spec_code:
        query = query.filter(SpecContent.spec_code == spec_code)
    results = query.order_by(SpecContent.spec_code, SpecContent.page_number).limit(limit).all()

    return [
        {
            "id": r.id,
            "spec_code": r.spec_code,
            "spec_label": SPEC_REGISTRY.get(r.spec_code, r.spec_code),
            "page_number": r.page_number,
            "chapter": r.chapter,
            "section": r.section,
            "title": r.title,
            # 検索キーワード周辺200文字を抜粋
            "snippet": _make_snippet(r.body_text, q),
        }
        for r in results
    ]


@router.get("/content/{content_id}")
def get_spec_content(
    content_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """1ページ分の全文を取得。"""
    sc = db.query(SpecContent).filter(SpecContent.id == content_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="ページが見つかりません")
    return {
        "id": sc.id,
        "spec_code": sc.spec_code,
        "spec_label": SPEC_REGISTRY.get(sc.spec_code, sc.spec_code),
        "page_number": sc.page_number,
        "chapter": sc.chapter,
        "section": sc.section,
        "title": sc.title,
        "body_text": sc.body_text,
    }


def _make_snippet(text: str, keyword: str, context_chars: int = 100) -> str:
    """キーワード周辺の本文を抜粋する。"""
    idx = text.lower().find(keyword.lower())
    if idx < 0:
        return text[:200]
    start = max(0, idx - context_chars)
    end = min(len(text), idx + len(keyword) + context_chars)
    snippet = text[start:end]
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    return snippet
