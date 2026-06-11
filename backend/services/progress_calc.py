"""G6 出来高調書 集計サービス — 月別エントリの累計と調書合計を再計算する。

- recalc_row: ProgressRow に紐づく ProgressEntry の progress_qty / progress_amount
  を全件合算して cumulative_qty / cumulative_amount を更新。
- recalc_statement: 全行を recalc 後、調書の total_progress_amount を
  「当月分の progress_amount 合計」で再計算する。
- generate_rows_from_estimate: 見積 (Estimate) の Section/Item を走査し、
  ProgressRow を 1 件ずつ生成する。
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from models.estimate_item import EstimateItem
from models.estimate_section import EstimateSection
from models.progress_entry import ProgressEntry
from models.progress_row import ProgressRow
from models.progress_statement import ProgressStatement
from models.business_docs import Estimate


def recalc_row(db: Session, row: ProgressRow) -> ProgressRow:
    """ProgressRow に紐づく全 ProgressEntry を累計し row の cumulative_* を更新する。

    返り値: 更新後の row (flush 済み・commit はしない)
    """
    if row is None:
        raise ValueError("row is required")

    entries: list[ProgressEntry] = (
        db.query(ProgressEntry).filter(ProgressEntry.row_id == row.id).all()
    )

    cum_qty: Decimal = Decimal(0)
    cum_amount: int = 0
    for e in entries:
        qty = e.progress_qty if e.progress_qty is not None else Decimal(0)
        amount = e.progress_amount if e.progress_amount is not None else 0
        cum_qty += Decimal(qty)
        cum_amount += int(amount)

    row.cumulative_qty = cum_qty
    row.cumulative_amount = cum_amount
    db.flush()
    return row


def recalc_statement(db: Session, statement: ProgressStatement) -> ProgressStatement:
    """調書配下の全行を recalc し、当月分 (year, month) の合計を
    statement.total_progress_amount として再計算する。
    """
    if statement is None:
        raise ValueError("statement is required")

    rows: list[ProgressRow] = (
        db.query(ProgressRow).filter(ProgressRow.statement_id == statement.id).all()
    )
    for row in rows:
        recalc_row(db, row)

    # 当月分 (statement.year / month) の progress_amount を合算
    monthly_entries: list[ProgressEntry] = (
        db.query(ProgressEntry)
        .filter(
            ProgressEntry.statement_id == statement.id,
            ProgressEntry.year == statement.year,
            ProgressEntry.month == statement.month,
        )
        .all()
    )
    total: int = sum(int(e.progress_amount or 0) for e in monthly_entries)
    statement.total_progress_amount = total
    db.flush()
    return statement


def generate_rows_from_estimate(
    db: Session,
    statement: ProgressStatement,
    estimate: Estimate,
    user: Any,
) -> int:
    """Estimate の全 Section/Item を走査し、ProgressRow を 1 件ずつ作成する。

    既存行はそのままで、新規行のみ append する。返り値は作成した行数。
    """
    if statement is None:
        raise ValueError("statement is required")
    if estimate is None:
        raise ValueError("estimate is required")

    if statement.tenant_id != estimate.tenant_id:
        raise ValueError("statement and estimate tenant mismatch")

    sections: list[EstimateSection] = (
        db.query(EstimateSection)
        .filter(EstimateSection.estimate_id == estimate.id)
        .order_by(EstimateSection.sort_order.asc(), EstimateSection.level.asc())
        .all()
    )

    created_count: int = 0
    next_sort_order: int = (
        db.query(ProgressRow).filter(ProgressRow.statement_id == statement.id).count()
    )

    for section in sections:
        items: list[EstimateItem] = (
            db.query(EstimateItem)
            .filter(EstimateItem.section_id == section.id)
            .order_by(EstimateItem.sort_order.asc())
            .all()
        )
        for item in items:
            row = ProgressRow(
                tenant_id=statement.tenant_id,
                statement_id=statement.id,
                source_item_id=item.id,
                source_section_id=section.id,
                name=item.name,
                specification=item.specification,
                contract_qty=item.quantity if item.quantity is not None else Decimal(0),
                contract_unit=item.unit,
                contract_unit_price=int(item.sale_unit_price or 0),
                contract_amount=int(item.sale_amount or 0),
                cumulative_qty=Decimal(0),
                cumulative_amount=0,
                sort_order=next_sort_order,
            )
            db.add(row)
            next_sort_order += 1
            created_count += 1

    db.flush()
    return created_count
