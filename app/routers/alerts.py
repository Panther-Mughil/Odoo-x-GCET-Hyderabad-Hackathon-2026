import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, OperationDocument, StockMove, Location, DocType, DocStatus
from app.services.ledger import get_product_total_stock

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


class AutoReorderRequest(BaseModel):
    product_id: int
    dest_location_id: Optional[int] = None
    supplier_name: Optional[str] = None
    notes: Optional[str] = None


def random_suffix() -> str:
    return uuid.uuid4().hex[:4].upper()


@router.get("/reorder-suggestions")
def get_reorder_suggestions(db: Session = Depends(get_db)):
    """
    Query all products, calculate double-entry on-hand stock, and return
    reorder suggestions for products with on_hand <= min_reorder_qty.
    """
    products = db.query(Product).all()
    suggestions = []

    for product in products:
        on_hand = get_product_total_stock(db, product.id)
        if on_hand <= product.min_reorder_qty:
            suggested_purchase_qty = product.target_stock_qty - on_hand
            if suggested_purchase_qty < 0:
                suggested_purchase_qty = 0.0
            
            estimated_cost = round(suggested_purchase_qty * product.cost_price, 2)
            urgency = "CRITICAL" if on_hand <= 0 else "WARNING"

            suggestions.append({
                "product_id": product.id,
                "id": product.id,
                "product_name": product.name,
                "name": product.name,
                "sku": product.sku,
                "category": product.category.name if product.category else "General",
                "uom": product.uom,
                "cost_price": product.cost_price,
                "on_hand": on_hand,
                "min_reorder_qty": product.min_reorder_qty,
                "reorder_threshold": product.min_reorder_qty,
                "target_stock_qty": product.target_stock_qty,
                "target_stock": product.target_stock_qty,
                "suggested_purchase_qty": suggested_purchase_qty,
                "estimated_cost": estimated_cost,
                "urgency": urgency
            })

    return suggestions


@router.post("/auto-reorder")
def auto_reorder_product(req: AutoReorderRequest, db: Session = Depends(get_db)):
    """
    Automatically create a new incoming Receipt document in draft status
    for a low-stock product with the suggested purchase quantity.
    """
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {req.product_id} not found"
        )

    on_hand = get_product_total_stock(db, product.id)
    if on_hand > product.min_reorder_qty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"No reorder required for '{product.name}'. "
                f"Current stock ({on_hand} {product.uom}) is above minimum threshold ({product.min_reorder_qty} {product.uom})."
            )
        )

    suggested_purchase_qty = product.target_stock_qty - on_hand
    if suggested_purchase_qty <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Suggested reorder quantity is {suggested_purchase_qty}. "
                f"Target stock ({product.target_stock_qty}) must be greater than current stock ({on_hand})."
            )
        )

    # Locate vendor source location
    vendor_loc = db.query(Location).filter(Location.full_path == "Vendors/Incoming").first()
    if not vendor_loc:
        vendor_loc = db.query(Location).filter(Location.location_type == "vendor").first()
    if not vendor_loc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vendor incoming location not configured in system"
        )

    # Locate destination location
    if req.dest_location_id:
        dest_loc = db.query(Location).filter(Location.id == req.dest_location_id).first()
        if not dest_loc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Destination location with id {req.dest_location_id} not found"
            )
    else:
        dest_loc = db.query(Location).filter(Location.full_path == "WH1/Main Store").first()
        if not dest_loc:
            dest_loc = db.query(Location).filter(Location.location_type == "internal").first()
    if not dest_loc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal warehouse destination location not configured in system"
        )

    doc_num = f"REC-{datetime.datetime.utcnow().strftime('%y%m%d')}-{random_suffix()}"
    supplier_name = req.supplier_name or f"Auto-Reorder: {product.name} Supplier"
    notes = req.notes or (
        f"Automated reorder: on-hand ({on_hand} {product.uom}) <= min threshold "
        f"({product.min_reorder_qty} {product.uom}). Target: {product.target_stock_qty} {product.uom}."
    )

    doc = OperationDocument(
        doc_number=doc_num,
        doc_type=DocType.RECEIPT,
        status=DocStatus.DRAFT,
        partner_name=supplier_name,
        source_location_id=vendor_loc.id,
        dest_location_id=dest_loc.id,
        notes=notes
    )
    db.add(doc)
    db.flush()

    move = StockMove(
        document_id=doc.id,
        product_id=product.id,
        source_location_id=vendor_loc.id,
        dest_location_id=dest_loc.id,
        quantity=suggested_purchase_qty,
        status=DocStatus.DRAFT,
        reference=doc_num
    )
    db.add(move)
    db.commit()
    db.refresh(doc)

    estimated_cost = round(suggested_purchase_qty * product.cost_price, 2)

    return {
        "message": f"Auto-reorder receipt {doc_num} created successfully in draft status",
        "doc_number": doc_num,
        "document_id": doc.id,
        "product_id": product.id,
        "product_name": product.name,
        "sku": product.sku,
        "reorder_quantity": suggested_purchase_qty,
        "uom": product.uom,
        "estimated_cost": estimated_cost,
        "status": doc.status,
        "source_location": vendor_loc.full_path,
        "dest_location": dest_loc.full_path
    }
