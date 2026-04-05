"""Material (資材) management router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.material import MaterialOrder, MaterialOrderItem, MaterialTestRecord
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/materials", tags=["materials"])


# ---------- Schemas ----------

class OrderItemCreate(BaseModel):
    material_name: str
    specification: str | None = None
    quantity: float | None = None
    unit: str | None = None
    unit_price: int | None = None
    notes: str | None = None


class OrderCreate(BaseModel):
    order_number: str | None = None
    supplier_name: str | None = None
    order_date: date | None = None
    expected_delivery: date | None = None
    total_amount: int | None = None
    notes: str | None = None
    items: list[OrderItemCreate] = []


class OrderUpdate(BaseModel):
    supplier_name: str | None = None
    order_date: date | None = None
    expected_delivery: date | None = None
    total_amount: int | None = None
    status: str | None = None
    notes: str | None = None


class ReceiveRequest(BaseModel):
    item_id: str
    delivered_quantity: float


class TestRecordCreate(BaseModel):
    material_name: str
    test_type: str
    test_date: date | None = None
    test_location: str | None = None
    test_results: dict | None = None
    judgment: str = "pass"
    certificate_file_key: str | None = None
    tested_by: str | None = None
    notes: str | None = None


class TestRecordUpdate(BaseModel):
    test_results: dict | None = None
    judgment: str | None = None
    certificate_file_key: str | None = None
    notes: str | None = None


# ---------- Orders ----------

@router.get("/orders")
def list_orders(
    project_id: str,
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(MaterialOrder).filter(MaterialOrder.project_id == project_id)
    if status:
        q = q.filter(MaterialOrder.status == status)
    return q.order_by(MaterialOrder.created_at.desc()).all()


@router.post("/orders")
def create_order(
    project_id: str,
    req: OrderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items_data = req.items
    order = MaterialOrder(
        project_id=project_id,
        ordered_by=user.id,
        **req.model_dump(exclude={"items"}),
    )
    db.add(order)
    db.flush()
    for item in items_data:
        db.add(MaterialOrderItem(order_id=order.id, **item.model_dump()))
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders/{order_id}")
def get_order(
    project_id: str, order_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    order = db.query(MaterialOrder).filter(
        MaterialOrder.id == order_id, MaterialOrder.project_id == project_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="発注が見つかりません")
    items = db.query(MaterialOrderItem).filter(MaterialOrderItem.order_id == order_id).all()
    return {"order": order, "items": items}


@router.put("/orders/{order_id}")
def update_order(
    project_id: str, order_id: str, req: OrderUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    order = db.query(MaterialOrder).filter(
        MaterialOrder.id == order_id, MaterialOrder.project_id == project_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="発注が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(order, k, v)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/orders/{order_id}")
def delete_order(
    project_id: str, order_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    order = db.query(MaterialOrder).filter(
        MaterialOrder.id == order_id, MaterialOrder.project_id == project_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="発注が見つかりません")
    db.query(MaterialOrderItem).filter(MaterialOrderItem.order_id == order_id).delete()
    db.delete(order)
    db.commit()
    return {"status": "ok"}


@router.put("/orders/{order_id}/receive")
def receive_items(
    project_id: str, order_id: str, req: ReceiveRequest,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """Record delivery of a material order item."""
    order = db.query(MaterialOrder).filter(
        MaterialOrder.id == order_id, MaterialOrder.project_id == project_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="発注が見つかりません")
    item = db.query(MaterialOrderItem).filter(
        MaterialOrderItem.id == req.item_id, MaterialOrderItem.order_id == order_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="発注明細が見つかりません")
    item.delivered_quantity = req.delivered_quantity
    # Check if all items delivered
    items = db.query(MaterialOrderItem).filter(MaterialOrderItem.order_id == order_id).all()
    all_delivered = all(
        (i.delivered_quantity or 0) >= (i.quantity or 0) for i in items
    )
    if all_delivered:
        order.status = "delivered"
    else:
        order.status = "partial"
    db.commit()
    db.refresh(item)
    return {"item": item, "order_status": order.status}


# ---------- Test Records ----------

@router.get("/test-records")
def list_test_records(
    project_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return db.query(MaterialTestRecord).filter(
        MaterialTestRecord.project_id == project_id
    ).order_by(MaterialTestRecord.created_at.desc()).all()


@router.post("/test-records")
def create_test_record(
    project_id: str, req: TestRecordCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    record = MaterialTestRecord(project_id=project_id, **req.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/test-records/{record_id}")
def get_test_record(
    project_id: str, record_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    r = db.query(MaterialTestRecord).filter(
        MaterialTestRecord.id == record_id, MaterialTestRecord.project_id == project_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="試験記録が見つかりません")
    return r


@router.put("/test-records/{record_id}")
def update_test_record(
    project_id: str, record_id: str, req: TestRecordUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    r = db.query(MaterialTestRecord).filter(
        MaterialTestRecord.id == record_id, MaterialTestRecord.project_id == project_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="試験記録が見つかりません")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/test-records/{record_id}")
def delete_test_record(
    project_id: str, record_id: str,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    r = db.query(MaterialTestRecord).filter(
        MaterialTestRecord.id == record_id, MaterialTestRecord.project_id == project_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="試験記録が見つかりません")
    db.delete(r)
    db.commit()
    return {"status": "ok"}
