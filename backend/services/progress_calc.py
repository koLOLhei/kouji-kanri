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
    """Estimate の Section/Item または JSON items から ProgressRow を生成する。

    優先順位: (1) estimate_sections + estimate_items テーブルに行があればそれを使う、
    (2) なければ estimate.items (JSON) から行を作る。
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

    has_section_items = False
    for section in sections:
        items: list[EstimateItem] = (
            db.query(EstimateItem)
            .filter(EstimateItem.section_id == section.id)
            .order_by(EstimateItem.sort_order.asc())
            .all()
        )
        for item in items:
            has_section_items = True
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

    # Section/Item テーブルに行が無く、旧 API で作られた estimate.items JSON が
    # あれば、それを行として展開する (見積機能の旧/新両 API 互換)。
    if not has_section_items and estimate.items:
        json_items = estimate.items if isinstance(estimate.items, list) else []
        for it in json_items:
            if not isinstance(it, dict):
                continue
            qty = it.get("quantity") or it.get("qty") or 0
            try:
                qty_dec = Decimal(str(qty))
            except Exception:
                qty_dec = Decimal(0)
            unit_price = int(it.get("unit_price") or it.get("sale_unit_price") or 0)
            amount = int(it.get("amount") or 0)
            if not amount and qty_dec and unit_price:
                amount = int(qty_dec * unit_price)
            row = ProgressRow(
                tenant_id=statement.tenant_id,
                statement_id=statement.id,
                source_item_id=None,
                source_section_id=None,
                name=str(it.get("name") or "明細"),
                specification=it.get("specification") or it.get("spec"),
                contract_qty=qty_dec,
                contract_unit=it.get("unit"),
                contract_unit_price=unit_price,
                contract_amount=amount,
                cumulative_qty=Decimal(0),
                cumulative_amount=0,
                sort_order=next_sort_order,
            )
            db.add(row)
            next_sort_order += 1
            created_count += 1

    db.flush()
    return created_count
