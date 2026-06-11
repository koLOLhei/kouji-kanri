"""見積セクション/構造 API — Estimate 配下の Section / Item ツリー操作。

- Estimate + Sections + Items の一括取得 (ツリー)
- Section の作成 / 更新 / 削除 (子 Item ごと cascade)
- 見積全体の再計算
- 見積条件 (conditions_html) の更新
- 案件種別テンプレからの一括 Section/Item 生成
"""
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.estimate_item import EstimateItem
from models.estimate_section import EstimateSection
from models.project_type_template import ProjectTypeTemplate
from models.user import User
from services.auth_service import get_current_user
from services.estimate_calc import recalculate_estimate, recalculate_estimate_by_id

router = APIRouter(prefix="", tags=["estimate-sections"])


# ---------- Schemas ----------

class SectionCreate(BaseModel):
    name: str
    code: str | None = None
    parent_section_id: str | None = None
    sort_order: int | None = None


class SectionUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    parent_section_id: str | None = None
    sort_order: int | None = None


class ConditionsUpdate(BaseModel):
    conditions_html: str | None = None


class ApplyTemplateRequest(BaseModel):
    project_type_template_id: str


# ---------- Helpers ----------

def _get_estimate_or_404(db: Session, estimate_id: str, user: User) -> Estimate:
    """Estimate を取得し、テナント検証を行う。"""
    estimate = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if estimate is None:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    if estimate.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="この見積書へのアクセス権がありません")
    return estimate


def _get_section_or_404(db: Session, section_id: str, user: User) -> EstimateSection:
    """Section を取得し、テナント検証を行う。"""
    section = db.query(EstimateSection).filter(EstimateSection.id == section_id).first()
    if section is None:
        raise HTTPException(status_code=404, detail="セクションが見つかりません")
    if section.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="このセクションへのアクセス権がありません")
    return section


def _item_to_dict(item: EstimateItem) -> dict:
    return {
        "id": item.id,
        "section_id": item.section_id,
        "sort_order": item.sort_order,
        "name": item.name,
        "specification": item.specification,
        "quantity": float(item.quantity) if item.quantity is not None else 0,
        "unit": item.unit,
        "sale_unit_price": int(item.sale_unit_price or 0),
        "sale_amount": int(item.sale_amount or 0),
        "cost_unit_price": int(item.cost_unit_price or 0),
        "cost_amount": int(item.cost_amount or 0),
        "profit_amount": int(item.profit_amount or 0),
        "profit_rate": float(item.profit_rate or 0),
        "quantity_source_id": item.quantity_source_id,
        "work_type_code": item.work_type_code,
        "note": item.note,
    }


def _section_to_dict(section: EstimateSection, items: list[EstimateItem]) -> dict:
    return {
        "id": section.id,
        "estimate_id": section.estimate_id,
        "parent_section_id": section.parent_section_id,
        "code": section.code,
        "name": section.name,
        "sort_order": section.sort_order,
        "level": section.level,
        "sale_subtotal": int(section.sale_subtotal or 0),
        "cost_subtotal": int(section.cost_subtotal or 0),
        "profit_subtotal": int(section.profit_subtotal or 0),
        "items": [_item_to_dict(it) for it in items],
    }


def _estimate_to_dict(estimate: Estimate) -> dict:
    return {
        "id": estimate.id,
        "tenant_id": estimate.tenant_id,
        "estimate_number": estimate.estimate_number,
        "project_name": estimate.project_name,
        "customer_id": estimate.customer_id,
        "customer_name": estimate.customer_name,
        "subtotal": int(estimate.subtotal or 0),
        "tax_rate": float(estimate.tax_rate or 0),
        "tax_amount": int(estimate.tax_amount or 0),
        "total": int(estimate.total or 0),
        "cost_subtotal": int(estimate.cost_subtotal or 0),
        "gross_profit": int(estimate.gross_profit or 0),
        "gross_profit_rate": float(estimate.gross_profit_rate or 0),
        "status": estimate.status,
        "conditions_html": estimate.conditions_html,
        "project_id": estimate.project_id,
        "project_type_template_id": estimate.project_type_template_id,
        "notes": estimate.notes,
    }


# ---------- Endpoints ----------

@router.get("/api/estimates/{estimate_id}/full")
def get_estimate_full(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Estimate + Sections + Items を1リクエストでツリー返却。"""
    estimate = _get_estimate_or_404(db, estimate_id, user)

    sections = db.query(EstimateSection).filter(
        EstimateSection.estimate_id == estimate.id,
        EstimateSection.tenant_id == user.tenant_id,
    ).order_by(EstimateSection.sort_order, EstimateSection.created_at).all()

    section_ids = [s.id for s in sections]
    items_by_section: dict[str, list[EstimateItem]] = {sid: [] for sid in section_ids}
    if section_ids:
        items = db.query(EstimateItem).filter(
            EstimateItem.section_id.in_(section_ids),
            EstimateItem.tenant_id == user.tenant_id,
        ).order_by(EstimateItem.sort_order, EstimateItem.created_at).all()
        for it in items:
            items_by_section.setdefault(it.section_id, []).append(it)

    return {
        "estimate": _estimate_to_dict(estimate),
        "sections": [
            _section_to_dict(s, items_by_section.get(s.id, []))
            for s in sections
        ],
    }


@router.post("/api/estimates/{estimate_id}/sections", status_code=201)
def create_section(
    estimate_id: str,
    body: SectionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """新規 Section を作成。"""
    estimate = _get_estimate_or_404(db, estimate_id, user)

    # 親 Section 検証 + level 計算
    level = 1
    if body.parent_section_id:
        parent = db.query(EstimateSection).filter(
            EstimateSection.id == body.parent_section_id,
        ).first()
        if parent is None:
            raise HTTPException(status_code=404, detail="親セクションが見つかりません")
        if parent.tenant_id != user.tenant_id or parent.estimate_id != estimate.id:
            raise HTTPException(status_code=422, detail="親セクションがこの見積に属していません")
        level = int(parent.level or 1) + 1

    # sort_order が未指定なら末尾に追加
    sort_order = body.sort_order
    if sort_order is None:
        max_order = db.query(EstimateSection).filter(
            EstimateSection.estimate_id == estimate.id,
            EstimateSection.parent_section_id == body.parent_section_id,
        ).count()
        sort_order = max_order

    section = EstimateSection(
        tenant_id=user.tenant_id,
        estimate_id=estimate.id,
        parent_section_id=body.parent_section_id,
        code=body.code,
        name=body.name,
        sort_order=sort_order,
        level=level,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return _section_to_dict(section, [])


@router.put("/api/estimate-sections/{section_id}")
def update_section(
    section_id: str,
    body: SectionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Section の名称・順序・親を更新。"""
    section = _get_section_or_404(db, section_id, user)
    data = body.model_dump(exclude_unset=True)

    # 親変更時のループ検証 + level 再計算
    if "parent_section_id" in data:
        new_parent_id = data["parent_section_id"]
        if new_parent_id == section.id:
            raise HTTPException(status_code=422, detail="自分自身を親に設定できません")
        if new_parent_id is None:
            section.level = 1
        else:
            parent = db.query(EstimateSection).filter(
                EstimateSection.id == new_parent_id,
            ).first()
            if parent is None:
                raise HTTPException(status_code=404, detail="親セクションが見つかりません")
            if parent.tenant_id != user.tenant_id or parent.estimate_id != section.estimate_id:
                raise HTTPException(status_code=422, detail="親セクションがこの見積に属していません")
            # 親が自分の子孫でないかチェック
            cur = parent
            while cur is not None and cur.parent_section_id is not None:
                if cur.parent_section_id == section.id:
                    raise HTTPException(status_code=422, detail="親子関係が循環しています")
                cur = db.query(EstimateSection).filter(
                    EstimateSection.id == cur.parent_section_id,
                ).first()
            section.level = int(parent.level or 1) + 1
        section.parent_section_id = new_parent_id

    if "name" in data and data["name"] is not None:
        section.name = data["name"]
    if "code" in data:
        section.code = data["code"]
    if "sort_order" in data and data["sort_order"] is not None:
        section.sort_order = data["sort_order"]

    section.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(section)
    return _section_to_dict(section, [])


@router.delete("/api/estimate-sections/{section_id}", status_code=204)
def delete_section(
    section_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Section を削除 (子 Item ごと cascade)。"""
    section = _get_section_or_404(db, section_id, user)

    # 子 Item を明示的に削除 (cascade 設定済みだが安全のため)
    db.query(EstimateItem).filter(EstimateItem.section_id == section.id).delete(
        synchronize_session=False,
    )
    # 子 Section も削除
    child_sections = db.query(EstimateSection).filter(
        EstimateSection.parent_section_id == section.id,
    ).all()
    for child in child_sections:
        db.query(EstimateItem).filter(EstimateItem.section_id == child.id).delete(
            synchronize_session=False,
        )
        db.delete(child)

    db.delete(section)
    db.commit()
    return None


@router.post("/api/estimates/{estimate_id}/recalculate")
def recalculate_estimate_endpoint(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """見積全体を再計算 (Item → Section → Estimate の集計)。"""
    estimate = _get_estimate_or_404(db, estimate_id, user)
    try:
        recalculate_estimate_by_id(db, estimate.id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"再計算に失敗しました: {e}")
    db.commit()
    db.refresh(estimate)
    return _estimate_to_dict(estimate)


@router.put("/api/estimates/{estimate_id}/conditions")
def update_conditions(
    estimate_id: str,
    body: ConditionsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Estimate.conditions_html を更新。"""
    estimate = _get_estimate_or_404(db, estimate_id, user)
    estimate.conditions_html = body.conditions_html
    estimate.updated_at = datetime.now(timezone.utc) if hasattr(estimate, "updated_at") else estimate.updated_at
    db.commit()
    db.refresh(estimate)
    return {
        "id": estimate.id,
        "conditions_html": estimate.conditions_html,
    }


@router.post("/api/estimates/{estimate_id}/apply-template", status_code=201)
def apply_template(
    estimate_id: str,
    body: ApplyTemplateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """案件種別テンプレの default_sections から EstimateSection / EstimateItem を一括生成。"""
    estimate = _get_estimate_or_404(db, estimate_id, user)

    template = db.query(ProjectTypeTemplate).filter(
        ProjectTypeTemplate.id == body.project_type_template_id,
    ).first()
    if template is None:
        raise HTTPException(status_code=404, detail="案件種別テンプレートが見つかりません")
    if template.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="このテンプレートへのアクセス権がありません")

    default_sections = template.default_sections or []
    if not isinstance(default_sections, list):
        raise HTTPException(status_code=422, detail="テンプレートの default_sections が不正です")

    created_sections: list[EstimateSection] = []
    created_item_count = 0

    # 既存 Section の最大 sort_order を基点に追加
    base_order = db.query(EstimateSection).filter(
        EstimateSection.estimate_id == estimate.id,
        EstimateSection.parent_section_id.is_(None),
    ).count()

    for idx, sec_def in enumerate(default_sections):
        if not isinstance(sec_def, dict):
            continue
        name = sec_def.get("name")
        if not name:
            continue

        section = EstimateSection(
            tenant_id=user.tenant_id,
            estimate_id=estimate.id,
            parent_section_id=None,
            code=sec_def.get("code"),
            name=name,
            sort_order=base_order + idx,
            level=1,
        )
        db.add(section)
        db.flush()  # id を確定させる
        created_sections.append(section)

        items_def = sec_def.get("items") or []
        if not isinstance(items_def, list):
            items_def = []
        for it_idx, item_def in enumerate(items_def):
            if not isinstance(item_def, dict):
                continue
            item_name = item_def.get("name") or item_def.get("work_type_code") or "未設定項目"
            quantity_raw = item_def.get("quantity", 0)
            try:
                quantity = Decimal(str(quantity_raw))
            except Exception:
                quantity = Decimal("0")

            sale_unit_price = int(item_def.get("sale_unit_price") or 0)
            cost_unit_price = int(item_def.get("cost_unit_price") or 0)
            sale_amount = int(quantity * Decimal(sale_unit_price))
            cost_amount = int(quantity * Decimal(cost_unit_price))
            profit_amount = sale_amount - cost_amount
            profit_rate = round(profit_amount / sale_amount, 6) if sale_amount > 0 else 0.0

            item = EstimateItem(
                tenant_id=user.tenant_id,
                section_id=section.id,
                sort_order=it_idx,
                name=item_name,
                specification=item_def.get("specification"),
                quantity=quantity,
                unit=item_def.get("unit"),
                sale_unit_price=sale_unit_price,
                sale_amount=sale_amount,
                cost_unit_price=cost_unit_price,
                cost_amount=cost_amount,
                profit_amount=profit_amount,
                profit_rate=profit_rate,
                work_type_code=item_def.get("work_type_code"),
                note=item_def.get("note"),
            )
            db.add(item)
            created_item_count += 1

    estimate.project_type_template_id = template.id

    # 集計を更新
    db.flush()
    recalculate_estimate(db, estimate)

    db.commit()
    db.refresh(estimate)

    return {
        "estimate_id": estimate.id,
        "template_id": template.id,
        "created_sections": len(created_sections),
        "created_items": created_item_count,
        "estimate": _estimate_to_dict(estimate),
    }
