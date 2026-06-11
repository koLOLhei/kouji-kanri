"""G9 工事概要書 + 仕上マトリクス API

エンドポイント:
- GET  /api/projects/{project_id}/overview        工事概要書を取得 (なければ {} を返却)
- PUT  /api/projects/{project_id}/overview        工事概要書を upsert
- GET  /api/projects/{project_id}/finish-matrix   仕上マトリクスを取得 (?type=exterior|interior)
- PUT  /api/projects/{project_id}/finish-matrix   仕上マトリクスを置換 (全削除→新規挿入)
"""

from decimal import Decimal
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.finish_matrix_entry import FinishMatrixEntry
from models.project_overview import ProjectOverview
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access

router = APIRouter(prefix="/api/projects/{project_id}", tags=["project-overviews"])


# ---------- Schemas ----------

MatrixType = Literal["exterior", "interior"]


class OverviewUpsert(BaseModel):
    work_name: str | None = None
    work_location: str | None = None
    work_scope: str | None = None
    total_floor_area: Decimal | None = Field(default=None, ge=0)
    structure: str | None = None
    floors_breakdown: list[Any] | None = None
    separate_works: list[Any] | None = None
    special_notes: str | None = None
    remarks: str | None = None


class FinishMatrixEntryIn(BaseModel):
    floor: str | None = None
    location: str | None = None
    part: str | None = None
    spec_text: str | None = None
    sort_order: int = 0


class FinishMatrixReplace(BaseModel):
    matrix_type: MatrixType
    entries: list[FinishMatrixEntryIn] = Field(default_factory=list)


# ---------- Helpers ----------

def _overview_to_dict(o: ProjectOverview) -> dict[str, Any]:
    return {
        "id": o.id,
        "tenant_id": o.tenant_id,
        "project_id": o.project_id,
        "work_name": o.work_name,
        "work_location": o.work_location,
        "work_scope": o.work_scope,
        "total_floor_area": float(o.total_floor_area) if o.total_floor_area is not None else None,
        "structure": o.structure,
        "floors_breakdown": o.floors_breakdown,
        "separate_works": o.separate_works,
        "special_notes": o.special_notes,
        "remarks": o.remarks,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }


def _entry_to_dict(e: FinishMatrixEntry) -> dict[str, Any]:
    return {
        "id": e.id,
        "tenant_id": e.tenant_id,
        "project_id": e.project_id,
        "matrix_type": e.matrix_type,
        "floor": e.floor,
        "location": e.location,
        "part": e.part,
        "spec_text": e.spec_text,
        "sort_order": e.sort_order,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }


# ---------- Overview ----------

@router.get("/overview")
def get_overview(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """工事概要書を取得。未作成なら空の辞書を返す。"""
    verify_project_access(project_id, user, db)
    o = db.query(ProjectOverview).filter(
        ProjectOverview.project_id == project_id,
        ProjectOverview.tenant_id == user.tenant_id,
    ).first()
    if not o:
        return {}
    return _overview_to_dict(o)


@router.put("/overview")
def upsert_overview(
    project_id: str,
    req: OverviewUpsert,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """工事概要書を upsert する。存在しなければ新規作成、存在すれば更新。"""
    verify_project_access(project_id, user, db)
    o = db.query(ProjectOverview).filter(
        ProjectOverview.project_id == project_id,
        ProjectOverview.tenant_id == user.tenant_id,
    ).first()

    updates = req.model_dump(exclude_unset=True)

    if o is None:
        o = ProjectOverview(
            tenant_id=user.tenant_id,
            project_id=project_id,
            **updates,
        )
        db.add(o)
    else:
        for k, v in updates.items():
            setattr(o, k, v)

    db.commit()
    db.refresh(o)
    return _overview_to_dict(o)


# ---------- Finish Matrix ----------

@router.get("/finish-matrix")
def get_finish_matrix(
    project_id: str,
    type: MatrixType | None = Query(None, description="exterior | interior (省略時は両方返す)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """仕上マトリクスを取得。type 省略時は exterior と interior の両方を返す。"""
    verify_project_access(project_id, user, db)

    if type is None:
        entries = (
            db.query(FinishMatrixEntry)
            .filter(
                FinishMatrixEntry.project_id == project_id,
                FinishMatrixEntry.tenant_id == user.tenant_id,
            )
            .order_by(FinishMatrixEntry.sort_order.asc(), FinishMatrixEntry.created_at.asc())
            .all()
        )
        exterior = [_entry_to_dict(e) for e in entries if e.matrix_type == "exterior"]
        interior = [_entry_to_dict(e) for e in entries if e.matrix_type == "interior"]
        return {
            "exterior": exterior,
            "interior": interior,
            "items": [
                {"matrix_type": "exterior", "entries": exterior, "count": len(exterior)},
                {"matrix_type": "interior", "entries": interior, "count": len(interior)},
            ],
        }

    entries = (
        db.query(FinishMatrixEntry)
        .filter(
            FinishMatrixEntry.project_id == project_id,
            FinishMatrixEntry.tenant_id == user.tenant_id,
            FinishMatrixEntry.matrix_type == type,
        )
        .order_by(FinishMatrixEntry.sort_order.asc(), FinishMatrixEntry.created_at.asc())
        .all()
    )
    return {
        "matrix_type": type,
        "entries": [_entry_to_dict(e) for e in entries],
        "count": len(entries),
    }


@router.put("/finish-matrix")
def replace_finish_matrix(
    project_id: str,
    req: FinishMatrixReplace,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """仕上マトリクスを置換。指定 matrix_type の既存エントリを全削除して新規挿入する。"""
    verify_project_access(project_id, user, db)

    if req.matrix_type not in ("exterior", "interior"):
        raise HTTPException(status_code=422, detail="matrix_type は exterior か interior を指定してください")

    # 既存削除
    db.query(FinishMatrixEntry).filter(
        FinishMatrixEntry.project_id == project_id,
        FinishMatrixEntry.tenant_id == user.tenant_id,
        FinishMatrixEntry.matrix_type == req.matrix_type,
    ).delete(synchronize_session=False)

    # 新規挿入
    new_entries: list[FinishMatrixEntry] = []
    for entry in req.entries:
        e = FinishMatrixEntry(
            tenant_id=user.tenant_id,
            project_id=project_id,
            matrix_type=req.matrix_type,
            floor=entry.floor,
            location=entry.location,
            part=entry.part,
            spec_text=entry.spec_text,
            sort_order=entry.sort_order,
        )
        db.add(e)
        new_entries.append(e)

    db.commit()
    for e in new_entries:
        db.refresh(e)

    return {
        "matrix_type": req.matrix_type,
        "entries": [_entry_to_dict(e) for e in new_entries],
        "count": len(new_entries),
    }
