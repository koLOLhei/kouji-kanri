"""G13 Excel エクスポート router.

エンドポイント:
- GET /api/estimates/{estimate_id}/export.xlsx
- GET /api/progress-statements/{ps_id}/export.xlsx

services.excel_writer を用いて A4 印刷想定の xlsx を生成し、
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet として返す。
"""

from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.estimate_item import EstimateItem
from models.estimate_section import EstimateSection
from models.progress_entry import ProgressEntry
from models.progress_row import ProgressRow
from models.progress_statement import ProgressStatement
from models.user import User
from services.auth_service import get_current_user
from services.excel_writer import write_estimate_detail, write_progress_statement

router = APIRouter(prefix="", tags=["excel-exports"])

XLSX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)


def _content_disposition(filename: str) -> str:
    """RFC 5987 準拠の attachment ヘッダを組み立てる。"""
    ascii_safe = filename.encode("ascii", "ignore").decode("ascii") or "export.xlsx"
    quoted = quote(filename)
    return f"attachment; filename=\"{ascii_safe}\"; filename*=UTF-8''{quoted}"


@router.get("/api/estimates/{estimate_id}/export.xlsx")
def export_estimate_xlsx(
    estimate_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """見積内訳書を xlsx でダウンロード。"""
    estimate = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="見積が見つかりません")
    if estimate.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="この見積にアクセスする権限がありません")

    sections = (
        db.query(EstimateSection)
        .filter(
            EstimateSection.estimate_id == estimate.id,
            EstimateSection.tenant_id == user.tenant_id,
        )
        .order_by(EstimateSection.sort_order.asc(), EstimateSection.created_at.asc())
        .all()
    )

    sections_with_items: list[tuple[EstimateSection, list[EstimateItem]]] = []
    for section in sections:
        items = (
            db.query(EstimateItem)
            .filter(
                EstimateItem.section_id == section.id,
                EstimateItem.tenant_id == user.tenant_id,
            )
            .order_by(EstimateItem.sort_order.asc(), EstimateItem.created_at.asc())
            .all()
        )
        sections_with_items.append((section, items))

    try:
        content = write_estimate_detail(estimate, sections_with_items)
    except ValueError as ex:
        raise HTTPException(status_code=422, detail=str(ex))

    estimate_number = getattr(estimate, "estimate_number", None) or estimate.id
    filename = f"見積内訳書_{estimate_number}.xlsx"

    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": _content_disposition(filename)},
    )


@router.get("/api/progress-statements/{ps_id}/export.xlsx")
def export_progress_statement_xlsx(
    ps_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """出来高調書を xlsx でダウンロード。"""
    statement = (
        db.query(ProgressStatement).filter(ProgressStatement.id == ps_id).first()
    )
    if not statement:
        raise HTTPException(status_code=404, detail="出来高調書が見つかりません")
    if statement.tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=403, detail="この出来高調書にアクセスする権限がありません"
        )

    rows = (
        db.query(ProgressRow)
        .filter(
            ProgressRow.statement_id == statement.id,
            ProgressRow.tenant_id == user.tenant_id,
        )
        .order_by(ProgressRow.sort_order.asc(), ProgressRow.created_at.asc())
        .all()
    )

    rows_with_entries: list[tuple[ProgressRow, list[ProgressEntry]]] = []
    for row in rows:
        entries = (
            db.query(ProgressEntry)
            .filter(ProgressEntry.row_id == row.id)
            .order_by(ProgressEntry.year.asc(), ProgressEntry.month.asc())
            .all()
        )
        rows_with_entries.append((row, entries))

    try:
        content = write_progress_statement(statement, rows_with_entries)
    except ValueError as ex:
        raise HTTPException(status_code=422, detail=str(ex))

    period = (
        getattr(statement, "period_label", None)
        or f"{getattr(statement, 'year', '')}年{getattr(statement, 'month', '')}月"
    )
    filename = f"出来高調書_{period}.xlsx"

    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": _content_disposition(filename)},
    )
