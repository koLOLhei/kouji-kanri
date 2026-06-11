"""G3: 見積 面別×階別 数量入力 API。

- GET    /api/estimates/{estimate_id}/quantities
- POST   /api/estimates/{estimate_id}/quantities
- PUT    /api/estimate-quantities/{quantity_id}
- DELETE /api/estimate-quantities/{quantity_id}

POST/PUT 時にサーバ側で
  gross_area = width * height
  opening_total_area = sum(opening.width * opening.height * opening.count)
  net_area = gross_area - opening_total_area
  tile_count = net_area * TILE_PER_SQM
を再計算してから保存する。
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.business_docs import Estimate
from models.estimate_quantity import EstimateQuantity
from models.user import User
from services.auth_service import get_current_user

# 1㎡ あたりタイル枚数（定数）。仕様: net_area * 200 = 必要枚数
TILE_PER_SQM = 200

router = APIRouter(prefix="", tags=["estimate-quantities"])


# ---------- Schemas ----------

class Opening(BaseModel):
    """開口部 1 件。width × height × count で面積を算出。"""
    name: str | None = None
    width: float = 0
    height: float = 0
    count: int = 1


class QuantityCreate(BaseModel):
    face: str | None = Field(default=None, description="北/南/東/西 もしくは N/S/E/W")
    floor: int = 1
    width: float = 0
    height: float = 0
    openings: list[Opening] = Field(default_factory=list)
    sealant_length: float = 0
    note: str | None = None


class QuantityUpdate(BaseModel):
    face: str | None = None
    floor: int | None = None
    width: float | None = None
    height: float | None = None
    openings: list[Opening] | None = None
    sealant_length: float | None = None
    note: str | None = None


# ---------- Helpers ----------

def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _calc_opening_total(openings: list[dict] | None) -> Decimal:
    if not openings:
        return Decimal("0")
    total = Decimal("0")
    for op in openings:
        w = _to_decimal(op.get("width", 0))
        h = _to_decimal(op.get("height", 0))
        c = _to_decimal(op.get("count", 1))
        total += w * h * c
    return total


def _recalculate(record: EstimateQuantity, openings: list[dict] | None) -> None:
    """gross/opening_total/net/tile_count をサーバ側で再計算して record に書き込む。"""
    width = _to_decimal(record.width)
    height = _to_decimal(record.height)
    gross = width * height
    opening_total = _calc_opening_total(openings)
    net = gross - opening_total
    if net < 0:
        net = Decimal("0")
    record.gross_area = gross
    record.opening_total_area = opening_total
    record.net_area = net
    record.tile_count = int(net * TILE_PER_SQM)


def _serialize(record: EstimateQuantity) -> dict:
    return {
        "id": record.id,
        "tenant_id": record.tenant_id,
        "estimate_id": record.estimate_id,
        "face": record.face,
        "floor": record.floor,
        "width": float(record.width) if record.width is not None else 0,
        "height": float(record.height) if record.height is not None else 0,
        "gross_area": float(record.gross_area) if record.gross_area is not None else 0,
        "openings": record.openings or [],
        "opening_total_area": float(record.opening_total_area) if record.opening_total_area is not None else 0,
        "net_area": float(record.net_area) if record.net_area is not None else 0,
        "tile_count": record.tile_count or 0,
        "sealant_length": float(record.sealant_length) if record.sealant_length is not None else 0,
        "note": record.note,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }


def _get_estimate_or_404(db: Session, estimate_id: str, tenant_id: str) -> Estimate:
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.tenant_id == tenant_id,
    ).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="見積書が見つかりません")
    return estimate


def _get_quantity_or_404(db: Session, quantity_id: str, tenant_id: str) -> EstimateQuantity:
    record = db.query(EstimateQuantity).filter(
        EstimateQuantity.id == quantity_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="数量データが見つかりません")
    if record.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="この数量データへのアクセス権がありません")
    return record


# ---------- Endpoints ----------

@router.get("/api/estimates/{estimate_id}/quantities")
def list_quantities(
    estimate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """指定見積に紐づく数量一覧を返す。"""
    _get_estimate_or_404(db, estimate_id, current_user.tenant_id)
    rows = (
        db.query(EstimateQuantity)
        .filter(
            EstimateQuantity.estimate_id == estimate_id,
            EstimateQuantity.tenant_id == current_user.tenant_id,
        )
        .order_by(EstimateQuantity.floor.asc(), EstimateQuantity.face.asc(), EstimateQuantity.created_at.asc())
        .all()
    )
    return [_serialize(r) for r in rows]


@router.post("/api/estimates/{estimate_id}/quantities", status_code=201)
def create_quantity(
    estimate_id: str,
    body: QuantityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """数量データを 1 件追加。サーバ側で面積・タイル枚数を再計算して保存。"""
    _get_estimate_or_404(db, estimate_id, current_user.tenant_id)

    openings_data = [op.model_dump() for op in body.openings]

    record = EstimateQuantity(
        tenant_id=current_user.tenant_id,
        estimate_id=estimate_id,
        face=body.face,
        floor=body.floor,
        width=_to_decimal(body.width),
        height=_to_decimal(body.height),
        openings=openings_data,
        sealant_length=_to_decimal(body.sealant_length),
        note=body.note,
    )
    _recalculate(record, openings_data)

    db.add(record)
    db.commit()
    db.refresh(record)
    return _serialize(record)


@router.put("/api/estimate-quantities/{quantity_id}")
def update_quantity(
    quantity_id: str,
    body: QuantityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """数量データ更新。width/height/openings が変わったら再計算。"""
    record = _get_quantity_or_404(db, quantity_id, current_user.tenant_id)

    data = body.model_dump(exclude_unset=True)

    if "face" in data:
        record.face = data["face"]
    if "floor" in data and data["floor"] is not None:
        record.floor = data["floor"]
    if "width" in data and data["width"] is not None:
        record.width = _to_decimal(data["width"])
    if "height" in data and data["height"] is not None:
        record.height = _to_decimal(data["height"])
    if "sealant_length" in data and data["sealant_length"] is not None:
        record.sealant_length = _to_decimal(data["sealant_length"])
    if "note" in data:
        record.note = data["note"]

    if "openings" in data and data["openings"] is not None:
        openings_data = [
            op if isinstance(op, dict) else op.model_dump()
            for op in data["openings"]
        ]
        record.openings = openings_data
    else:
        openings_data = record.openings or []

    # width/height/openings いずれかが変わったら必ず再計算（取りこぼし防止のため常に再計算）
    _recalculate(record, openings_data)

    db.commit()
    db.refresh(record)
    return _serialize(record)


@router.delete("/api/estimate-quantities/{quantity_id}", status_code=204)
def delete_quantity(
    quantity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """数量データ削除。"""
    record = _get_quantity_or_404(db, quantity_id, current_user.tenant_id)
    db.delete(record)
    db.commit()
    return None
