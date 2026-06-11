"""G6 出来高調書 (Progress Statement) router.

エンドポイント:
- GET    /api/projects/{project_id}/progress-statements
- POST   /api/projects/{project_id}/progress-statements
- GET    /api/progress-statements/{ps_id}
- PUT    /api/progress-rows/{row_id}/entry
- POST   /api/progress-statements/{ps_id}/finalize
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.progress_entry import ProgressEntry
from models.progress_row import ProgressRow
from models.progress_statement import ProgressStatement
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services import progress_calc

router = APIRouter(prefix="", tags=["progress-statements"])


# ---------- Schemas ----------


class ProgressStatementCreate(BaseModel):
    year: int = Field(..., ge=1900, le=2999)
    month: int = Field(..., ge=1, le=12)
    estimate_id: str | None = None
    version: str = "initial"
    title: str | None = None
    period_label: str | None = None
    generate_from_estimate: bool = False


class ProgressEntryUpsert(BaseModel):
    year: int = Field(..., ge=1900, le=2999)
    month: int = Field(..., ge=1, le=12)
    progress_qty: Decimal = Field(default=Decimal(0))
    progress_amount: int | None = None
    progress_rate: float | None = None


# ---------- Helpers ----------


def _serialize_statement(ps: ProgressStatement) -> dict[str, Any]:
    return {
        "id": ps.id,
        "tenant_id": ps.tenant_id,
        "project_id": ps.project_id,
        "estimate_id": ps.estimate_id,
        "year": ps.year,
        "month": ps.month,
        "period_label": ps.period_label,
        "title": ps.title,
        "version": ps.version,
        "status": ps.status,
        "total_progress_amount": int(ps.total_progress_amount or 0),
        "finalized_at": ps.finalized_at.isoformat() if ps.finalized_at else None,
        "created_at": ps.created_at.isoformat() if ps.created_at else None,
        "updated_at": ps.updated_at.isoformat() if ps.updated_at else None,
    }


def _serialize_entry(e: ProgressEntry) -> dict[str, Any]:
    return {
        "id": e.id,
        "row_id": e.row_id,
        "statement_id": e.statement_id,
        "year": e.year,
        "month": e.month,
        "progress_qty": str(e.progress_qty) if e.progress_qty is not None else "0",
        "progress_amount": int(e.progress_amount or 0),
        "progress_rate": float(e.progress_rate or 0),
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }


def _serialize_row(row: ProgressRow, entries: list[ProgressEntry]) -> dict[str, Any]:
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "statement_id": row.statement_id,
        "source_item_id": row.source_item_id,
        "source_section_id": row.source_section_id,
        "name": row.name,
        "specification": row.specification,
        "contract_qty": str(row.contract_qty) if row.contract_qty is not None else "0",
        "contract_unit": row.contract_unit,
        "contract_unit_price": int(row.contract_unit_price or 0),
        "contract_amount": int(row.contract_amount or 0),
        "cumulative_qty": str(row.cumulative_qty) if row.cumulative_qty is not None else "0",
        "cumulative_amount": int(row.cumulative_amount or 0),
        "sort_order": row.sort_order,
        "entries": [_serialize_entry(e) for e in entries],
    }


# ---------- Endpoints ----------


@router.get("/api/projects/{project_id}/progress-statements")
def list_progress_statements(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """指定案件の出来高調書一覧を返す。"""
    verify_project_access(project_id, user, db)
    statements = (
        db.query(ProgressStatement)
        .filter(
            ProgressStatement.project_id == project_id,
            ProgressStatement.tenant_id == user.tenant_id,
        )
        .order_by(
            ProgressStatement.year.desc(),
            ProgressStatement.month.desc(),
            ProgressStatement.created_at.desc(),
        )
        .all()
    )
    return [_serialize_statement(s) for s in statements]


@router.post("/api/projects/{project_id}/progress-statements")
def create_progress_statement(
    project_id: str,
    req: ProgressStatementCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """新規の出来高調書を作成する。generate_from_estimate=true なら明細行を自動生成。"""
    verify_project_access(project_id, user, db)

    estimate: Estimate | None = None
    if req.estimate_id:
        estimate = (
            db.query(Estimate)
            .filter(
                Estimate.id == req.estimate_id,
                Estimate.tenant_id == user.tenant_id,
            )
            .first()
        )
        if not estimate:
            raise HTTPException(status_code=404, detail="見積が見つかりません")

    if req.generate_from_estimate and estimate is None:
        raise HTTPException(
            status_code=422,
            detail="estimate_id が必要です (generate_from_estimate=true)",
        )

    period_label = req.period_label or f"{req.year}年{req.month}月"

    ps = ProgressStatement(
        tenant_id=user.tenant_id,
        project_id=project_id,
        estimate_id=req.estimate_id,
        year=req.year,
        month=req.month,
        period_label=period_label,
        title=req.title,
        version=req.version,
        status="draft",
        total_progress_amount=0,
    )
    db.add(ps)
    db.flush()

    if req.generate_from_estimate and estimate is not None:
        try:
            progress_calc.generate_rows_from_estimate(db, ps, estimate, user)
        except ValueError as ex:
            db.rollback()
            raise HTTPException(status_code=422, detail=str(ex))

    db.commit()
    db.refresh(ps)
    return _serialize_statement(ps)


@router.get("/api/progress-statements/{ps_id}")
def get_progress_statement(
    ps_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """調書の詳細 (rows + entries を含む) を返す。"""
    ps = db.query(ProgressStatement).filter(ProgressStatement.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="出来高調書が見つかりません")
    if ps.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="この調書にアクセスする権限がありません")

    rows = (
        db.query(ProgressRow)
        .filter(ProgressRow.statement_id == ps.id)
        .order_by(ProgressRow.sort_order.asc(), ProgressRow.created_at.asc())
        .all()
    )

    row_ids = [r.id for r in rows]
    entries_by_row: dict[str, list[ProgressEntry]] = {rid: [] for rid in row_ids}
    if row_ids:
        all_entries = (
            db.query(ProgressEntry)
            .filter(ProgressEntry.row_id.in_(row_ids))
            .order_by(ProgressEntry.year.asc(), ProgressEntry.month.asc())
            .all()
        )
        for e in all_entries:
            entries_by_row.setdefault(e.row_id, []).append(e)

    payload = _serialize_statement(ps)
    payload["rows"] = [_serialize_row(r, entries_by_row.get(r.id, [])) for r in rows]
    return payload


@router.put("/api/progress-rows/{row_id}/entry")
def upsert_progress_entry(
    row_id: str,
    req: ProgressEntryUpsert,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """指定行の (year, month) のエントリを upsert し、累計と調書合計を再計算する。"""
    row = db.query(ProgressRow).filter(ProgressRow.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="明細行が見つかりません")
    if row.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="この明細行にアクセスする権限がありません")

    ps = (
        db.query(ProgressStatement)
        .filter(ProgressStatement.id == row.statement_id)
        .first()
    )
    if not ps:
        raise HTTPException(status_code=404, detail="出来高調書が見つかりません")
    if ps.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="この調書にアクセスする権限がありません")
    if ps.status == "finalized":
        raise HTTPException(status_code=422, detail="確定済みの調書は編集できません")

    # 契約値を取得 (再計算に使用)
    contract_qty = Decimal(row.contract_qty) if row.contract_qty is not None else Decimal(0)
    contract_amount = int(row.contract_amount or 0)
    contract_unit_price = int(row.contract_unit_price or 0)

    # 入力値を判定 (None または 0 は「未入力」扱い)
    in_qty = req.progress_qty if req.progress_qty is not None else Decimal(0)
    in_amount = req.progress_amount
    in_rate = req.progress_rate

    has_qty = in_qty is not None and Decimal(in_qty) != Decimal(0)
    has_amount = in_amount is not None and int(in_amount) != 0
    has_rate = in_rate is not None and float(in_rate) != 0.0

    # 優先順位: rate > amount > qty (Excel 要件: rate 入力時は契約値から逆算)
    if has_rate:
        # rate 入力 → contract_qty * rate, contract_amount * rate を自動算出
        rate = float(in_rate)
        qty = contract_qty * Decimal(str(rate))
        amount = int(Decimal(contract_amount) * Decimal(str(rate)))
    elif has_amount:
        # amount 入力 → rate と qty を逆算
        amount = int(in_amount)
        if contract_amount > 0:
            rate = float(amount) / float(contract_amount)
            qty = contract_qty * Decimal(str(rate))
        else:
            rate = 0.0
            qty = Decimal(0)
    elif has_qty:
        # qty 入力 → amount = qty * 単価、rate = amount / contract_amount
        qty = Decimal(in_qty)
        amount = int(qty * Decimal(contract_unit_price))
        rate = float(amount) / float(contract_amount) if contract_amount > 0 else 0.0
    else:
        # 全部 0 → クリア (ゼロエントリ)
        qty = Decimal(0)
        amount = 0
        rate = 0.0

    entry = (
        db.query(ProgressEntry)
        .filter(
            ProgressEntry.row_id == row.id,
            ProgressEntry.year == req.year,
            ProgressEntry.month == req.month,
        )
        .first()
    )
    if entry is None:
        entry = ProgressEntry(
            tenant_id=row.tenant_id,
            row_id=row.id,
            statement_id=row.statement_id,
            year=req.year,
            month=req.month,
            progress_qty=qty,
            progress_amount=amount,
            progress_rate=rate,
        )
        db.add(entry)
    else:
        entry.progress_qty = qty
        entry.progress_amount = amount
        entry.progress_rate = rate

    db.flush()

    progress_calc.recalc_row(db, row)
    progress_calc.recalc_statement(db, ps)

    db.commit()
    db.refresh(entry)
    db.refresh(row)
    db.refresh(ps)

    return {
        "entry": _serialize_entry(entry),
        "row": {
            "id": row.id,
            "cumulative_qty": str(row.cumulative_qty) if row.cumulative_qty is not None else "0",
            "cumulative_amount": int(row.cumulative_amount or 0),
        },
        "statement": {
            "id": ps.id,
            "total_progress_amount": int(ps.total_progress_amount or 0),
        },
    }


@router.post("/api/progress-statements/{ps_id}/finalize")
def finalize_progress_statement(
    ps_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """調書を確定 (status='finalized', finalized_at=now())。"""
    ps = db.query(ProgressStatement).filter(ProgressStatement.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="出来高調書が見つかりません")
    if ps.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="この調書にアクセスする権限がありません")
    if ps.status == "finalized":
        raise HTTPException(status_code=422, detail="この調書はすでに確定済みです")

    # 確定前に最終再計算
    progress_calc.recalc_statement(db, ps)

    ps.status = "finalized"
    ps.finalized_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ps)
    return _serialize_statement(ps)
