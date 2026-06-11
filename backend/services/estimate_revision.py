"""見積改訂 (revise) サービス。

元の Estimate を凍結スナップショットしつつ、新しい改訂版を Section/Item ごと
deep copy する。差分は diff_estimates で前後比較する。

呼び出し側で db.commit() を呼ぶこと。本サービスは db.flush() までしか行わない。
"""

from __future__ import annotations

import logging
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from models.business_docs import Estimate
from models.estimate_item import EstimateItem
from models.estimate_section import EstimateSection

logger = logging.getLogger(__name__)


# --- snapshot helpers ----------------------------------------------------

def _section_to_dict(section: EstimateSection) -> dict[str, Any]:
    return {
        "id": section.id,
        "parent_section_id": section.parent_section_id,
        "code": section.code,
        "name": section.name,
        "sort_order": section.sort_order,
        "level": section.level,
        "sale_subtotal": section.sale_subtotal,
        "cost_subtotal": section.cost_subtotal,
        "profit_subtotal": section.profit_subtotal,
    }


def _item_to_dict(item: EstimateItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "section_id": item.section_id,
        "sort_order": item.sort_order,
        "name": item.name,
        "specification": item.specification,
        "quantity": str(item.quantity) if item.quantity is not None else None,
        "unit": item.unit,
        "sale_unit_price": item.sale_unit_price,
        "sale_amount": item.sale_amount,
        "cost_unit_price": item.cost_unit_price,
        "cost_amount": item.cost_amount,
        "profit_amount": item.profit_amount,
        "profit_rate": item.profit_rate,
        "work_type_code": item.work_type_code,
        "note": item.note,
    }


def _build_snapshot(
    db: Session, source: Estimate
) -> tuple[dict[str, Any], list[EstimateSection], list[EstimateItem]]:
    """元 Estimate の Section / Item を取得し snapshot 辞書を組み立てる。"""
    sections = (
        db.query(EstimateSection)
        .filter(EstimateSection.estimate_id == source.id)
        .order_by(EstimateSection.sort_order)
        .all()
    )
    section_ids = [s.id for s in sections]
    items: list[EstimateItem] = []
    if section_ids:
        items = (
            db.query(EstimateItem)
            .filter(EstimateItem.section_id.in_(section_ids))
            .order_by(EstimateItem.sort_order)
            .all()
        )

    snapshot = {
        "sections": [_section_to_dict(s) for s in sections],
        "items": [_item_to_dict(i) for i in items],
    }
    return snapshot, sections, items


# --- core: create_revision ----------------------------------------------

def create_revision(db: Session, source_estimate_id: str, user: Any) -> Estimate:
    """元 Estimate から改訂版を新規作成する。

    1. 元 estimate を Read
    2. snapshot を {sections, items} 形式で JSON 化
    3. 新 Estimate を作成 (parent_estimate_id, revision_no+1, snapshot_json, status='draft')
    4. Section / Item を deep copy
    5. db.flush()  (commit は呼び出し側)

    Raises:
        ValueError: 元 estimate が存在しない / テナント不一致時。
    """
    source: Estimate | None = (
        db.query(Estimate).filter(Estimate.id == source_estimate_id).first()
    )
    if source is None:
        raise ValueError(f"estimate not found: {source_estimate_id}")

    tenant_id = getattr(user, "tenant_id", None)
    if tenant_id is not None and source.tenant_id != tenant_id:
        raise ValueError("estimate belongs to another tenant")

    snapshot, sections, items = _build_snapshot(db, source)

    new_estimate = Estimate(
        id=str(uuid.uuid4()),
        tenant_id=source.tenant_id,
        estimate_number=source.estimate_number,
        project_name=source.project_name,
        customer_id=source.customer_id,
        customer_name=source.customer_name,
        items=source.items,
        subtotal=source.subtotal,
        tax_rate=source.tax_rate,
        tax_amount=source.tax_amount,
        total=source.total,
        valid_until=source.valid_until,
        status="draft",
        notes=source.notes,
        file_key=None,
        created_by=getattr(user, "id", None) or source.created_by,
        parent_estimate_id=source.id,
        revision_no=(source.revision_no or 0) + 1,
        snapshot_json=snapshot,
        project_type_template_id=source.project_type_template_id,
        project_id=source.project_id,
        cost_subtotal=source.cost_subtotal,
        gross_profit=source.gross_profit,
        gross_profit_rate=source.gross_profit_rate,
        conditions_html=source.conditions_html,
        approval_status="not_submitted",
    )
    db.add(new_estimate)
    db.flush()  # new_estimate.id を確定させる

    # Section の deep copy: 旧 section.id -> 新 section.id のマップを作る
    section_id_map: dict[str, str] = {}
    new_sections: list[EstimateSection] = []
    for s in sections:
        new_section_id = str(uuid.uuid4())
        section_id_map[s.id] = new_section_id
        new_sections.append(
            EstimateSection(
                id=new_section_id,
                tenant_id=s.tenant_id,
                estimate_id=new_estimate.id,
                parent_section_id=None,  # 後で貼り直し
                code=s.code,
                name=s.name,
                sort_order=s.sort_order,
                level=s.level,
                sale_subtotal=s.sale_subtotal,
                cost_subtotal=s.cost_subtotal,
                profit_subtotal=s.profit_subtotal,
            )
        )

    # 親子リンクを新IDで張り替え
    for orig, copy in zip(sections, new_sections):
        if orig.parent_section_id and orig.parent_section_id in section_id_map:
            copy.parent_section_id = section_id_map[orig.parent_section_id]
        db.add(copy)

    # Item の deep copy: section_id を新IDに付け替え
    for it in items:
        new_section_id = section_id_map.get(it.section_id)
        if new_section_id is None:
            # 旧 section が見つからない孤児はスキップ
            continue
        db.add(
            EstimateItem(
                id=str(uuid.uuid4()),
                tenant_id=it.tenant_id,
                section_id=new_section_id,
                sort_order=it.sort_order,
                name=it.name,
                specification=it.specification,
                quantity=it.quantity if it.quantity is not None else Decimal(0),
                unit=it.unit,
                sale_unit_price=it.sale_unit_price,
                sale_amount=it.sale_amount,
                cost_unit_price=it.cost_unit_price,
                cost_amount=it.cost_amount,
                profit_amount=it.profit_amount,
                profit_rate=it.profit_rate,
                quantity_source_id=it.quantity_source_id,
                work_type_code=it.work_type_code,
                note=it.note,
            )
        )

    db.flush()
    logger.info(
        "[estimate-revision] created revision rev=%s parent=%s new_id=%s "
        "(sections=%d items=%d)",
        new_estimate.revision_no,
        source.id,
        new_estimate.id,
        len(sections),
        len(items),
    )
    return new_estimate


# --- diff ----------------------------------------------------------------

# Item の差分検知に使う比較フィールド
_ITEM_DIFF_FIELDS: tuple[str, ...] = (
    "name",
    "specification",
    "quantity",
    "unit",
    "sale_unit_price",
    "sale_amount",
    "cost_unit_price",
    "cost_amount",
    "profit_amount",
    "profit_rate",
    "work_type_code",
    "note",
    "sort_order",
)

_SECTION_DIFF_FIELDS: tuple[str, ...] = (
    "code",
    "name",
    "sort_order",
    "level",
    "sale_subtotal",
    "cost_subtotal",
    "profit_subtotal",
)


def _item_key(item: EstimateItem) -> str:
    """同一性判定キー。work_type_code+name+specification で「同じ項目」とみなす。"""
    return "|".join(
        [
            (item.work_type_code or ""),
            (item.name or ""),
            (item.specification or ""),
        ]
    )


def _section_key(section: EstimateSection) -> str:
    return "|".join([(section.code or ""), (section.name or "")])


def _load_tree(
    db: Session, estimate_id: str
) -> tuple[list[EstimateSection], list[EstimateItem]]:
    sections = (
        db.query(EstimateSection)
        .filter(EstimateSection.estimate_id == estimate_id)
        .all()
    )
    section_ids = [s.id for s in sections]
    items: list[EstimateItem] = []
    if section_ids:
        items = (
            db.query(EstimateItem)
            .filter(EstimateItem.section_id.in_(section_ids))
            .all()
        )
    return sections, items


def diff_estimates(
    db: Session, base_estimate_id: str, target_estimate_id: str
) -> dict[str, list[dict[str, Any]]]:
    """元 (base) と新 (target) の Section / Item を比較する。

    Returns:
        {
          "added":   [{kind:'section'|'item', key, after}],
          "removed": [{kind:'section'|'item', key, before}],
          "changed": [{path, before, after}]
        }
    """
    base = db.query(Estimate).filter(Estimate.id == base_estimate_id).first()
    target = db.query(Estimate).filter(Estimate.id == target_estimate_id).first()
    if base is None:
        raise ValueError(f"base estimate not found: {base_estimate_id}")
    if target is None:
        raise ValueError(f"target estimate not found: {target_estimate_id}")

    base_sections, base_items = _load_tree(db, base.id)
    target_sections, target_items = _load_tree(db, target.id)

    added: list[dict[str, Any]] = []
    removed: list[dict[str, Any]] = []
    changed: list[dict[str, Any]] = []

    # --- Section 差分 ---
    base_section_map = {_section_key(s): s for s in base_sections}
    target_section_map = {_section_key(s): s for s in target_sections}

    for key, s in target_section_map.items():
        if key not in base_section_map:
            added.append({"kind": "section", "key": key, "after": _section_to_dict(s)})
    for key, s in base_section_map.items():
        if key not in target_section_map:
            removed.append({"kind": "section", "key": key, "before": _section_to_dict(s)})
    for key, t in target_section_map.items():
        b = base_section_map.get(key)
        if b is None:
            continue
        for field in _SECTION_DIFF_FIELDS:
            bv = getattr(b, field)
            tv = getattr(t, field)
            if bv != tv:
                changed.append(
                    {
                        "path": f"section[{key}].{field}",
                        "before": bv,
                        "after": tv,
                    }
                )

    # --- Item 差分 (section_key + item_key で同一性判定) ---
    base_section_by_id = {s.id: s for s in base_sections}
    target_section_by_id = {s.id: s for s in target_sections}

    def _full_item_key(item: EstimateItem, section_lookup: dict[str, EstimateSection]) -> str:
        sec = section_lookup.get(item.section_id)
        sec_key = _section_key(sec) if sec else ""
        return f"{sec_key}::{_item_key(item)}"

    base_item_map = {
        _full_item_key(i, base_section_by_id): i for i in base_items
    }
    target_item_map = {
        _full_item_key(i, target_section_by_id): i for i in target_items
    }

    for key, i in target_item_map.items():
        if key not in base_item_map:
            added.append({"kind": "item", "key": key, "after": _item_to_dict(i)})
    for key, i in base_item_map.items():
        if key not in target_item_map:
            removed.append({"kind": "item", "key": key, "before": _item_to_dict(i)})
    for key, t in target_item_map.items():
        b = base_item_map.get(key)
        if b is None:
            continue
        for field in _ITEM_DIFF_FIELDS:
            bv = getattr(b, field)
            tv = getattr(t, field)
            # Decimal/数値は文字列ではなく値で比較
            if bv != tv:
                changed.append(
                    {
                        "path": f"item[{key}].{field}",
                        "before": str(bv) if isinstance(bv, Decimal) else bv,
                        "after": str(tv) if isinstance(tv, Decimal) else tv,
                    }
                )

    return {"added": added, "removed": removed, "changed": changed}
