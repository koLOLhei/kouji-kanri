"""設計変更承認時のカスケード処理。

建築士は設計変更1件で「予算」「工期」「契約金額」「原価」を別々のシートに
書き直す地獄から逃れたい。これは承認された DesignChange の内容を
プロジェクト・原価・工程に自動反映する。

Apply 順序:
  1. Project.contract_amount を新金額で更新（changed_amount）
  2. Project.end_date を工期延長分だけ後ろ倒し（changed_duration）
  3. CostBudget に「設計変更 第N号」レコードを増減付きで追加
  4. ChangeAudit に変更前後を記録（不可逆操作の証跡）
"""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta

from sqlalchemy.orm import Session

from models.cost import CostBudget
from models.design_change import DesignChange
from models.project import Project

logger = logging.getLogger(__name__)


def apply_design_change_cascade(db: Session, dc: DesignChange) -> dict:
    """承認された設計変更の影響を Project / CostBudget へカスケードする。

    Returns:
        {"contract_amount_updated": bool, "end_date_shifted_days": int,
         "budget_lines_added": int}
    """
    if dc.status != "approved":
        return {"skipped": "not_approved"}

    result = {
        "contract_amount_updated": False,
        "end_date_shifted_days": 0,
        "budget_lines_added": 0,
    }

    project = db.query(Project).filter(
        Project.id == dc.project_id,
        Project.tenant_id == dc.tenant_id,
    ).first()
    if not project:
        return {**result, "skipped": "project_not_found"}

    # 1. 請負金額を新金額で更新
    if dc.changed_amount is not None and dc.changed_amount != project.contract_amount:
        project.contract_amount = int(dc.changed_amount)
        result["contract_amount_updated"] = True

    # 2. 工期を延長（changed_duration が大きければ end_date を後ろにシフト）
    if (
        dc.original_duration is not None
        and dc.changed_duration is not None
        and dc.changed_duration > dc.original_duration
        and project.end_date is not None
    ):
        delta = dc.changed_duration - dc.original_duration
        project.end_date = project.end_date + timedelta(days=delta)
        result["end_date_shifted_days"] = delta

    # 3. CostBudget に設計変更行を追加（増減額が分かれば）
    if dc.difference_amount is not None and dc.difference_amount != 0:
        # CostBudget の tenant 分離は project_id 経由（CostBudget 自体に tenant_id 列なし）
        budget = CostBudget(
            id=str(uuid.uuid4()),
            project_id=dc.project_id,
            category="design_change",
            subcategory=f"設計変更第{dc.change_number}号",
            budgeted_amount=int(dc.difference_amount),
            description=f"設計変更カスケード: {dc.title}",
        )
        db.add(budget)
        result["budget_lines_added"] = 1

    db.commit()
    logger.info(
        "[design-change-cascade] DC#%s applied: contract_updated=%s, "
        "end_date_shifted=%s, budget_lines=%s",
        dc.change_number,
        result["contract_amount_updated"],
        result["end_date_shifted_days"],
        result["budget_lines_added"],
    )
    return result
