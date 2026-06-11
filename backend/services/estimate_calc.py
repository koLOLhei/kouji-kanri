"""見積金額の集計計算サービス — Item / Section / Estimate を再集計する。

売上 (sale_*) と原価 (cost_*) を 2 系統持ち、粗利 (profit) と粗利率 (rate) を派生計算する。
各関数は db.commit() を呼ばない (呼び出し側責務)。
"""

from decimal import Decimal
from typing import Iterable

from sqlalchemy.orm import Session

from models.business_docs import Estimate
from models.estimate_section import EstimateSection
from models.estimate_item import EstimateItem


def _calc_rate(profit: int, sale: int) -> float:
    """粗利率を計算 (sale=0 の場合は 0)。"""
    if sale <= 0:
        return 0.0
    return round(profit / sale, 6)


def recalculate_item(db: Session, item: EstimateItem) -> EstimateItem:
    """細目 (Item) を再計算: 売上額・原価額・粗利・粗利率を更新。"""
    if item is None:
        raise ValueError("item is required")

    quantity = item.quantity if item.quantity is not None else Decimal("0")
    if not isinstance(quantity, Decimal):
        quantity = Decimal(str(quantity))

    sale_unit_price = int(item.sale_unit_price or 0)
    cost_unit_price = int(item.cost_unit_price or 0)

    sale_amount = int(quantity * Decimal(sale_unit_price))
    cost_amount = int(quantity * Decimal(cost_unit_price))
    profit_amount = sale_amount - cost_amount

    item.sale_amount = sale_amount
    item.cost_amount = cost_amount
    item.profit_amount = profit_amount
    item.profit_rate = _calc_rate(profit_amount, sale_amount)

    return item


def recalculate_section(db: Session, section: EstimateSection) -> EstimateSection:
    """大項目 (Section) を再計算: 配下の Item を再計算してから合算。"""
    if section is None:
        raise ValueError("section is required")

    items: Iterable[EstimateItem] = db.query(EstimateItem).filter(
        EstimateItem.section_id == section.id
    ).all()

    sale_subtotal = 0
    cost_subtotal = 0
    profit_subtotal = 0

    for item in items:
        recalculate_item(db, item)
        sale_subtotal += int(item.sale_amount or 0)
        cost_subtotal += int(item.cost_amount or 0)
        profit_subtotal += int(item.profit_amount or 0)

    section.sale_subtotal = sale_subtotal
    section.cost_subtotal = cost_subtotal
    section.profit_subtotal = profit_subtotal

    return section


def recalculate_estimate(db: Session, estimate: Estimate) -> Estimate:
    """見積全体を再計算: 全 Section を再計算してから合算し、粗利・粗利率を更新。"""
    if estimate is None:
        raise ValueError("estimate is required")

    sections: Iterable[EstimateSection] = db.query(EstimateSection).filter(
        EstimateSection.estimate_id == estimate.id
    ).all()

    sale_total = 0
    cost_total = 0
    profit_total = 0

    for section in sections:
        recalculate_section(db, section)
        sale_total += int(section.sale_subtotal or 0)
        cost_total += int(section.cost_subtotal or 0)
        profit_total += int(section.profit_subtotal or 0)

    estimate.subtotal = sale_total
    estimate.cost_subtotal = cost_total
    estimate.gross_profit = profit_total
    estimate.gross_profit_rate = _calc_rate(profit_total, sale_total)

    tax_rate = float(estimate.tax_rate or 0.0)
    tax_amount = int(sale_total * tax_rate / 100.0)
    estimate.tax_amount = tax_amount
    estimate.total = sale_total + tax_amount

    return estimate


def recalculate_estimate_by_id(db: Session, estimate_id: str) -> Estimate:
    """id から Estimate を取得して再計算。"""
    if not estimate_id:
        raise ValueError("estimate_id is required")

    estimate = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if estimate is None:
        raise ValueError(f"Estimate not found: {estimate_id}")

    return recalculate_estimate(db, estimate)
