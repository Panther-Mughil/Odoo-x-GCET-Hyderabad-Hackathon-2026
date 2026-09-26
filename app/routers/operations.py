import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import OperationDocument, StockMove, Location, Product, DocType, DocStatus, User
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

@router.get("")
def list_operations(
    doc_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(OperationDocument).order_by(OperationDocument.id.desc())
    if doc_type and doc_type != "all":
        query = query.filter(OperationDocument.doc_type == doc_type)
    if status and status != "all":
        query = query.filter(OperationDocument.status == status)
    
    docs = query.all()
    results = []
    for d in docs:
        item_summary = []
        for m in d.moves:
            item_summary.append({
                "product_name": m.product.name,
                "sku": m.product.sku,
                "quantity": m.quantity,
                "uom": m.product.uom
            })
        results.append({
            "id": d.id,
            "doc_number": d.doc_number,
            "doc_type": d.doc_type,
            "status": d.status,
            "partner_name": d.partner_name or "N/A",
            "source_location": d.source_location.full_path if d.source_location else "N/A",
            "dest_location": d.dest_location.full_path if d.dest_location else "N/A",
            "created_at": d.created_at.strftime("%Y-%m-%d %H:%M"),
            "items": item_summary
        })
    return results

@router.post("/receipts")
def create_receipt(req: CreateReceiptRequest, db: Session = Depends(get_db)):
    vendor_loc = db.query(Location).filter(Location.full_path == "Vendors/Incoming").first()
    if not vendor_loc:
        raise HTTPException(status_code=500, detail="Vendor location not configured")

    doc_num = f"REC-{datetime.datetime.utcnow().strftime('%y%m%d')}-{random_suffix()}"
    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.RECEIPT,
        status=DocStatus.READY,
        partner_name=req.supplier_name,
        source_location_id=vendor_loc.id,
        dest_location_id=req.dest_location_id,
        notes=req.notes
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
            reference=doc_num
        )
    
    doc.status = DocStatus.DONE # Validated and stock incremented
    db.commit()
    return {"message": "Receipt validated and stock incremented", "doc_number": doc_num}

@router.post("/deliveries")
def create_delivery(req: CreateDeliveryRequest, db: Session = Depends(get_db)):
    cust_loc = db.query(Location).filter(Location.full_path == "Customers/Outgoing").first()
    if not cust_loc:
        raise HTTPException(status_code=500, detail="Customer location not configured")

    # Availability Check
    for item in req.items:
        available = get_product_location_stock(db, item.product_id, req.source_location_id)
        if available < item.quantity:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {prod.name}. Available: {available}, Required: {item.quantity}"
            )

    doc_num = f"DEL-{datetime.datetime.utcnow().strftime('%y%m%d')}-{random_suffix()}"
    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.DELIVERY,
        status=DocStatus.DONE,
        partner_name=req.customer_name,
        source_location_id=req.source_location_id,
        dest_location_id=cust_loc.id,
        notes=req.notes
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
            reference=doc_num
        )
    db.commit()
    return {"message": "Delivery validated and stock decremented", "doc_number": doc_num}

@router.post("/transfers")
def create_internal_transfer(req: CreateTransferRequest, db: Session = Depends(get_db)):
    for item in req.items:
        available = get_product_location_stock(db, item.product_id, req.source_location_id)
        if available < item.quantity:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transfer {prod.name}. Available at source: {available}, Requested: {item.quantity}"
            )

    doc_num = f"INT-{datetime.datetime.utcnow().strftime('%y%m%d')}-{random_suffix()}"
    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.INTERNAL,
        status=DocStatus.DONE,
        partner_name="Internal Movement",
        source_location_id=req.source_location_id,
        dest_location_id=req.dest_location_id,
        notes=req.notes
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
            reference=doc_num
        )
    db.commit()
    return {"message": "Internal transfer completed successfully", "doc_number": doc_num}

@router.post("/adjustments")
def create_stock_adjustment(req: CreateAdjustmentRequest, db: Session = Depends(get_db)):
    recorded = get_product_location_stock(db, req.product_id, req.location_id)
    diff = req.counted_quantity - recorded

    if diff == 0:
        return {"message": "No adjustment required, counted stock matches recorded stock exactly."}

    doc_num = f"ADJ-{datetime.datetime.utcnow().strftime('%y%m%d')}-{random_suffix()}"
    loss_loc = db.query(Location).filter(Location.full_path == "Virtual/Loss & Scrap").first()
    prod = db.query(Product).filter(Product.id == req.product_id).first()

    if diff < 0:
        # Physical is lower than recorded (Damage / Loss): Source=Warehouse, Dest=Loss
        src_id = req.location_id
        dest_id = loss_loc.id
        abs_qty = abs(diff)
    else:
        # Physical is higher than recorded (Found stock): Source=Loss, Dest=Warehouse
        src_id = loss_loc.id
        dest_id = req.location_id
        abs_qty = diff

    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.ADJUSTMENT,
        status=DocStatus.DONE,
        partner_name=f"Adjustment: {req.reason}",
        source_location_id=src_id,
        dest_location_id=dest_id,
        notes=f"Recorded: {recorded} -> Counted: {req.counted_quantity} (Difference: {diff} {prod.uom})"
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
        reference=doc_num
    )
    db.commit()
    return {
        "message": f"Stock adjusted from {recorded} to {req.counted_quantity} {prod.uom}",
        "difference": diff,
        "doc_number": doc_num
    }

def random_suffix():
    return uuid.uuid4().hex[:4].upper()
