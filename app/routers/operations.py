import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    OperationDocument,
    StockMove,
    Location,
    Product,
    DocType,
    DocStatus,
    User,
)
from app.services.ledger import create_stock_move, get_product_location_stock

router = APIRouter(prefix="/api/operations", tags=["Operations"])


class MoveLineItem(BaseModel):
    product_id: int
    quantity: float


class CreateReceiptRequest(BaseModel):
    supplier_name: str
    dest_location_id: int
    items: List[MoveLineItem]
    notes: Optional[str] = None


class CreateDeliveryRequest(BaseModel):
    customer_name: str
    source_location_id: int
    items: List[MoveLineItem]
    notes: Optional[str] = None


class CreateTransferRequest(BaseModel):
    source_location_id: int
    dest_location_id: int
    items: List[MoveLineItem]
    notes: Optional[str] = None


class CreateAdjustmentRequest(BaseModel):
    location_id: int
    product_id: int
    counted_quantity: float
    reason: Optional[str] = "Physical Count Verification"


def get_current_time():
    try:
        return datetime.datetime.now(datetime.UTC)
    except AttributeError:
        return datetime.datetime.utcnow()


@router.get("")
def list_operations(
    doc_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(OperationDocument).order_by(OperationDocument.id.desc())
    if doc_type and doc_type != "all":
        query = query.filter(OperationDocument.doc_type == doc_type)
    if status and status != "all":
        query = query.filter(OperationDocument.status == status)
    docs = query.all()
    results = []
    for d in docs:
        item_summary = [
            {
                "product_name": m.product.name if m.product else "N/A",
                "sku": m.product.sku if m.product else "N/A",
                "quantity": m.quantity,
                "uom": m.product.uom if m.product else "units",
            }
            for m in d.moves
        ]
        results.append(
            {
                "id": d.id,
                "doc_number": d.doc_number,
                "doc_type": d.doc_type,
                "status": d.status,
                "partner_name": d.partner_name or "N/A",
                "source_location": (
                    d.source_location.full_path if d.source_location else "N/A"
                ),
                "dest_location": (
                    d.dest_location.full_path if d.dest_location else "N/A"
                ),
                "created_at": d.created_at.strftime("%Y-%m-%d %H:%M") if d.created_at else "N/A",
                "items": item_summary,
            }
        )
    return results


@router.post("/receipts")
def create_receipt(req: CreateReceiptRequest, db: Session = Depends(get_db)):
    if not req.items:
        raise HTTPException(status_code=400, detail="Receipt must contain at least one item")

    dest_loc = db.query(Location).filter(Location.id == req.dest_location_id).first()
    if not dest_loc:
        raise HTTPException(status_code=400, detail=f"Destination location id {req.dest_location_id} not found")

    vendor_loc = db.query(Location).filter(Location.full_path == "Vendors/Incoming").first()
    if not vendor_loc:
        vendor_loc = db.query(Location).filter(Location.location_type == "vendor").first()
    if not vendor_loc:
        raise HTTPException(status_code=500, detail="Vendor location not configured")

    for item in req.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Item quantity must be greater than 0")
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product with id {item.product_id} not found")

    doc_num = f"REC-{get_current_time().strftime('%y%m%d')}-{random_suffix()}"
    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.RECEIPT,
        status=DocStatus.DRAFT,
        partner_name=req.supplier_name,
        source_location_id=vendor_loc.id,
        dest_location_id=req.dest_location_id,
        notes=req.notes,
    )
    db.add(doc)
    db.flush()

    for item in req.items:
        create_stock_move(
            db=db,
            product_id=item.product_id,
            source_location_id=vendor_loc.id,
            dest_location_id=req.dest_location_id,
            quantity=item.quantity,
            document_id=doc.id,
            reference=doc_num,
            status=DocStatus.DRAFT,
        )
    db.commit()
    return {"message": "Receipt draft created successfully", "doc_number": doc_num, "document_id": doc.id}


@router.post("/deliveries")
def create_delivery(req: CreateDeliveryRequest, db: Session = Depends(get_db)):
    if not req.items:
        raise HTTPException(status_code=400, detail="Delivery order must contain at least one item")

    source_loc = db.query(Location).filter(Location.id == req.source_location_id).first()
    if not source_loc:
        raise HTTPException(status_code=400, detail=f"Source location id {req.source_location_id} not found")

    cust_loc = db.query(Location).filter(Location.full_path == "Customers/Outgoing").first()
    if not cust_loc:
        cust_loc = db.query(Location).filter(Location.location_type == "customer").first()
    if not cust_loc:
        raise HTTPException(status_code=500, detail="Customer location not configured")

    for item in req.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Item quantity must be greater than 0")
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product with id {item.product_id} not found")

    doc_num = f"DEL-{get_current_time().strftime('%y%m%d')}-{random_suffix()}"
    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.DELIVERY,
        status=DocStatus.DRAFT,
        partner_name=req.customer_name,
        source_location_id=req.source_location_id,
        dest_location_id=cust_loc.id,
        notes=req.notes,
    )
    db.add(doc)
    db.flush()

    for item in req.items:
        create_stock_move(
            db=db,
            product_id=item.product_id,
            source_location_id=req.source_location_id,
            dest_location_id=cust_loc.id,
            quantity=item.quantity,
            document_id=doc.id,
            reference=doc_num,
            status=DocStatus.DRAFT,
        )
    db.commit()
    return {"message": "Delivery draft created successfully", "doc_number": doc_num, "document_id": doc.id}


@router.post("/transfers")
def create_internal_transfer(
    req: CreateTransferRequest, db: Session = Depends(get_db)
):
    if not req.items:
        raise HTTPException(status_code=400, detail="Transfer must contain at least one item")

    source_loc = db.query(Location).filter(Location.id == req.source_location_id).first()
    if not source_loc:
        raise HTTPException(status_code=400, detail=f"Source location id {req.source_location_id} not found")
    dest_loc = db.query(Location).filter(Location.id == req.dest_location_id).first()
    if not dest_loc:
        raise HTTPException(status_code=400, detail=f"Destination location id {req.dest_location_id} not found")

    for item in req.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Item quantity must be greater than 0")
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product with id {item.product_id} not found")

    doc_num = f"INT-{get_current_time().strftime('%y%m%d')}-{random_suffix()}"
    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.INTERNAL,
        status=DocStatus.DRAFT,
        partner_name="Internal Movement",
        source_location_id=req.source_location_id,
        dest_location_id=req.dest_location_id,
        notes=req.notes,
    )
    db.add(doc)
    db.flush()

    for item in req.items:
        create_stock_move(
            db=db,
            product_id=item.product_id,
            source_location_id=req.source_location_id,
            dest_location_id=req.dest_location_id,
            quantity=item.quantity,
            document_id=doc.id,
            reference=doc_num,
            status=DocStatus.DRAFT,
        )
    db.commit()
    return {"message": "Internal transfer draft created successfully", "doc_number": doc_num, "document_id": doc.id}


@router.post("/adjustments")
def create_stock_adjustment(
    req: CreateAdjustmentRequest, db: Session = Depends(get_db)
):
    if req.counted_quantity < 0:
        raise HTTPException(status_code=400, detail="Counted quantity cannot be negative")

    prod = db.query(Product).filter(Product.id == req.product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail=f"Product with id {req.product_id} not found")

    loc = db.query(Location).filter(Location.id == req.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail=f"Location with id {req.location_id} not found")

    recorded = get_product_location_stock(db, req.product_id, req.location_id)
    diff = req.counted_quantity - recorded
    if diff == 0:
        return {"message": "No adjustment required, counted stock matches recorded stock exactly."}

    doc_num = f"ADJ-{get_current_time().strftime('%y%m%d')}-{random_suffix()}"
    loss_loc = db.query(Location).filter(Location.full_path == "Virtual/Loss & Scrap").first()
    if not loss_loc:
        loss_loc = db.query(Location).filter(Location.location_type == "virtual").first()
    if not loss_loc:
        raise HTTPException(status_code=500, detail="Virtual loss location not configured")

    if diff < 0:
        src_id, dest_id, abs_qty = req.location_id, loss_loc.id, abs(diff)
    else:
        src_id, dest_id, abs_qty = loss_loc.id, req.location_id, diff

    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.ADJUSTMENT,
        status=DocStatus.DONE,
        partner_name=f"Adjustment: {req.reason}",
        source_location_id=src_id,
        dest_location_id=dest_id,
        notes=f"Recorded: {recorded} -> Counted: {req.counted_quantity} (Difference: {diff} {prod.uom})",
    )
    db.add(doc)
    db.flush()

    create_stock_move(
        db=db,
        product_id=req.product_id,
        source_location_id=src_id,
        dest_location_id=dest_id,
        quantity=abs_qty,
        document_id=doc.id,
        reference=doc_num,
        status=DocStatus.DONE,
    )
    db.commit()
    return {
        "message": f"Stock adjusted from {recorded} to {req.counted_quantity} {prod.uom}",
        "difference": diff,
        "doc_number": doc_num,
        "document_id": doc.id,
    }


@router.post("/{doc_id}/mark_ready")
def mark_operation_ready(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(OperationDocument).filter(OperationDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Operation document not found")
    if doc.status in [DocStatus.DONE, DocStatus.CANCELED]:
        raise HTTPException(status_code=400, detail=f"Cannot mark ready a {doc.status} operation")

    if doc.doc_type in [DocType.DELIVERY, DocType.INTERNAL]:
        all_available = True
        for move in doc.moves:
            available = get_product_location_stock(db, move.product_id, doc.source_location_id)
            if available < move.quantity:
                all_available = False
                break
        if not all_available:
            doc.status = DocStatus.WAITING
            for move in doc.moves:
                move.status = DocStatus.WAITING
            db.commit()
            return {
                "message": "Operation marked as waiting due to insufficient stock",
                "doc_number": doc.doc_number,
                "status": doc.status,
            }

    doc.status = DocStatus.READY
    for move in doc.moves:
        move.status = DocStatus.READY
    db.commit()
    return {
        "message": f"Operation {doc.doc_number} marked as ready",
        "doc_number": doc.doc_number,
        "status": doc.status,
    }


@router.post("/{doc_id}/validate")
def validate_operation(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(OperationDocument).filter(OperationDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Operation document not found")
    if doc.status == DocStatus.DONE:
        return {
            "message": "Document is already validated",
            "doc_number": doc.doc_number,
            "status": doc.status,
        }

    if doc.doc_type in [DocType.DELIVERY, DocType.INTERNAL]:
        for move in doc.moves:
            available = get_product_location_stock(db, move.product_id, doc.source_location_id)
            if available < move.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {move.product.name if move.product else 'product'}. Available: {available}, Required: {move.quantity}",
                )

    doc.status = DocStatus.DONE
    for move in doc.moves:
        move.status = DocStatus.DONE
    db.commit()
    return {
        "message": f"Operation {doc.doc_number} validated successfully",
        "doc_number": doc.doc_number,
        "status": doc.status,
    }


@router.post("/{doc_id}/cancel")
def cancel_operation(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(OperationDocument).filter(OperationDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Operation document not found")
    if doc.status == DocStatus.DONE:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed operation")
    doc.status = DocStatus.CANCELED
    for move in doc.moves:
        move.status = DocStatus.CANCELED
    db.commit()
    return {
        "message": f"Operation {doc.doc_number} canceled",
        "doc_number": doc.doc_number,
        "status": doc.status,
    }


def random_suffix():
    return uuid.uuid4().hex[:4].upper()
