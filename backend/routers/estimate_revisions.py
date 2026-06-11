"""見積改訂 (Estimate Revision) router — G5。

- POST /api/estimates/{estimate_id}/revise           : 改訂版を作成
- GET  /api/estimates/{estimate_id}/revisions        : parent チェーンを辿った一覧
- GET  /api/estimates/{estimate_id}/diff?compare_to= : 2つの見積の差分
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.user import User
from services.auth_service import get_current_user
from services import estimate_revision as estimate_revision_service

router = APIRouter(prefix="/api/estimates", tags=["estimate-revisions"])


# ---------- Schemas ----------

class ReviseResponse(BaseModel):
    id: str
    parent_estimate_id: str | None
    revision_no: int | None
    status: str | None
    approval_status: str | None


class RevisionListItem(BaseModel):
    id: str
    parent_estimate_id: str | None
    revision_no: int | None
    estimate_number: str | None
    project_name: str | None
    status: str | None
    approval_status: str | None
    total: int | None


class DiffResponse(BaseModel):
    base_estimate_id: str
    target_estimate_id: str
    added: list[dict[str, Any]]
    removed: list[dict[str, Any]]
    changed: list[dict[str, Any]]


# ---------- Helpers ----------

def _get_estimate_or_404(db: Session, estimate_id: str, user: User) -> Estimate:
    est = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if est is None:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    if est.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="この見積書へのアクセス権限がありません")
    return est


# ---------- Routes ----------

@router.post("/{estimate_id}/revise", response_model=ReviseResponse)
def revise_estimate(
    estimate_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """元の見積から新しい改訂版を作成する。"""
    # tenant チェック (404/403)
    _get_estimate_or_404(db, estimate_id, user)

    try:
        new_estimate = estimate_revision_service.create_revision(
            db=db, source_estimate_id=estimate_id, user=user
        )
    except ValueError as e:
        # サービス側の "not found" / "another tenant" を 422 として返す
        raise HTTPException(status_code=422, detail=f"改訂作成に失敗しました: {e}") from e

    db.commit()
    db.refresh(new_estimate)

    return ReviseResponse(
        id=new_estimate.id,
        parent_estimate_id=new_estimate.parent_estimate_id,
        revision_no=new_estimate.revision_no,
        status=new_estimate.status,
        approval_status=new_estimate.approval_status,
    )


@router.get("/{estimate_id}/revisions", response_model=list[RevisionListItem])
def list_revisions(
    estimate_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """指定の見積から parent チェーンを辿って改訂履歴を返す。

    戻り順は revision_no 昇順 (古い → 新しい)。
    """
    current = _get_estimate_or_404(db, estimate_id, user)

    # parent を辿ってルートを探す
    chain: list[Estimate] = []
    visited: set[str] = set()
    cursor: Estimate | None = current
    # ループ防止のため最大100世代
    depth = 0
    while cursor is not None and depth < 100:
        if cursor.id in visited:
            break
        visited.add(cursor.id)
        chain.append(cursor)
        if not cursor.parent_estimate_id:
            break
        parent = (
            db.query(Estimate)
            .filter(Estimate.id == cursor.parent_estimate_id)
            .first()
        )
        if parent is None or parent.tenant_id != user.tenant_id:
            break
        cursor = parent
        depth += 1

    # ルート Estimate を取得した上で、そこから派生する全改訂版を子方向に辿る
    root = chain[-1]
    all_in_tree: dict[str, Estimate] = {root.id: root}
    frontier: list[str] = [root.id]
    while frontier:
        children = (
            db.query(Estimate)
            .filter(
                Estimate.tenant_id == user.tenant_id,
                Estimate.parent_estimate_id.in_(frontier),
            )
            .all()
        )
        frontier = []
        for ch in children:
            if ch.id in all_in_tree:
                continue
            all_in_tree[ch.id] = ch
            frontier.append(ch.id)

    items = sorted(
        all_in_tree.values(), key=lambda e: (e.revision_no or 0, e.created_at)
    )
    return [
        RevisionListItem(
            id=e.id,
            parent_estimate_id=e.parent_estimate_id,
            revision_no=e.revision_no,
            estimate_number=e.estimate_number,
            project_name=e.project_name,
            status=e.status,
            approval_status=e.approval_status,
            total=e.total,
        )
        for e in items
    ]


@router.get("/{estimate_id}/diff", response_model=DiffResponse)
def diff_revision(
    estimate_id: str,
    compare_to: str = Query(..., description="比較対象の Estimate ID"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """estimate_id (base) と compare_to (target) の差分を返す。"""
    base = _get_estimate_or_404(db, estimate_id, user)
    target = _get_estimate_or_404(db, compare_to, user)

    try:
        result = estimate_revision_service.diff_estimates(
            db=db, base_estimate_id=base.id, target_estimate_id=target.id
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"差分計算に失敗しました: {e}") from e

    return DiffResponse(
        base_estimate_id=base.id,
        target_estimate_id=target.id,
        added=result.get("added", []),
        removed=result.get("removed", []),
        changed=result.get("changed", []),
    )
