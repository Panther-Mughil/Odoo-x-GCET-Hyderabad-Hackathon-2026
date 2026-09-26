from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (
    Product,
    OperationDocument,
    StockMove,
    Location,
    Warehouse,
    DocType,
    DocStatus,
)
from app.services.ledger import get_product_total_stock

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/kpis")
def get_dashboard_kpis(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    total_products_count = len(products)

    low_stock_count = 0
    out_of_stock_count = 0
    total_units_on_hand = 0.0

    category_distribution = {}
    for p in products:
        qty = get_product_total_stock(db, p.id)
        total_units_on_hand += qty
        if qty == 0:
            out_of_stock_count += 1
            low_stock_count += 1
        elif qty <= p.min_reorder_qty:
            low_stock_count += 1

        cat_name = p.category.name if p.category else "Other"
        category_distribution[cat_name] = category_distribution.get(cat_name, 0) + qty

    pending_receipts = (
        db.query(OperationDocument)
        .filter(
            OperationDocument.doc_type == DocType.RECEIPT,
            OperationDocument.status.in_(
                [DocStatus.DRAFT, DocStatus.WAITING, DocStatus.READY]
            ),
        )
        .count()
    )

    pending_deliveries = (
        db.query(OperationDocument)
        .filter(
            OperationDocument.doc_type == DocType.DELIVERY,
            OperationDocument.status.in_(
                [DocStatus.DRAFT, DocStatus.WAITING, DocStatus.READY]
            ),
        )
        .count()
    )

    scheduled_transfers = (
        db.query(OperationDocument)
        .filter(
            OperationDocument.doc_type == DocType.INTERNAL,
            OperationDocument.status.in_(
                [DocStatus.DRAFT, DocStatus.WAITING, DocStatus.READY]
            ),
        )
        .count()
    )

    # Total counts by document type
    receipts_done = (
        db.query(OperationDocument)
        .filter(OperationDocument.doc_type == DocType.RECEIPT)
        .count()
    )
    deliveries_done = (
        db.query(OperationDocument)
        .filter(OperationDocument.doc_type == DocType.DELIVERY)
        .count()
    )
    transfers_done = (
        db.query(OperationDocument)
        .filter(OperationDocument.doc_type == DocType.INTERNAL)
        .count()
    )
    adjustments_done = (
        db.query(OperationDocument)
        .filter(OperationDocument.doc_type == DocType.ADJUSTMENT)
        .count()
    )

    return {
        "total_sku_count": total_products_count,
        "total_units_on_hand": total_units_on_hand,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "pending_receipts": pending_receipts,
        "pending_deliveries": pending_deliveries,
        "scheduled_transfers": scheduled_transfers,
        "category_distribution": category_distribution,
        "operation_counts": {
            "receipts": receipts_done,
            "deliveries": deliveries_done,
            "transfers": transfers_done,
            "adjustments": adjustments_done,
        },
    }


@router.get("/ledger")
def get_stock_ledger(
    limit: int = 50,
    product_id: Optional[int] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(StockMove).order_by(StockMove.id.desc())
    if product_id:
        query = query.filter(StockMove.product_id == product_id)
    if location_id:
        query = query.filter(
            (StockMove.source_location_id == location_id)
            | (StockMove.dest_location_id == location_id)
        )

    moves = query.limit(limit).all()
    results = []
    for m in moves:
        results.append(
            {
                "id": m.id,
                "date": m.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "reference": m.reference or "N/A",
                "product_name": m.product.name,
                "sku": m.product.sku,
                "quantity": m.quantity,
                "uom": m.product.uom,
                "from_location": m.source_location.full_path,
                "to_location": m.dest_location.full_path,
                "status": m.status,
            }
        )
    return results


@router.get("/topology")
def get_warehouse_topology(db: Session = Depends(get_db)):
    warehouses = db.query(Warehouse).all()
    res = []
    for wh in warehouses:
        locs = []
        for l in wh.locations:
            locs.append(
                {
                    "id": l.id,
                    "name": l.name,
                    "full_path": l.full_path,
                    "type": l.location_type,
                }
            )
        res.append(
            {
                "id": wh.id,
                "code": wh.code,
                "name": wh.name,
                "address": wh.address,
                "locations": locs,
            }
        )
    return res
