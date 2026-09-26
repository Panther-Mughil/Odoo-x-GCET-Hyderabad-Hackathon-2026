from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import StockMove, Location, Product, OperationDocument, DocStatus


def get_product_location_stock(db: Session, product_id: int, location_id: int) -> float:
    """Calculate double-entry on-hand stock for a product at a specific location:
    sum(in) - sum(out)
    """
    incoming = (
        db.query(func.coalesce(func.sum(StockMove.quantity), 0.0))
        .filter(
            StockMove.product_id == product_id,
            StockMove.dest_location_id == location_id,
            StockMove.status == DocStatus.DONE,
        )
        .scalar()
    )

    outgoing = (
        db.query(func.coalesce(func.sum(StockMove.quantity), 0.0))
        .filter(
            StockMove.product_id == product_id,
            StockMove.source_location_id == location_id,
            StockMove.status == DocStatus.DONE,
        )
        .scalar()
    )

    return float(incoming) - float(outgoing)


def get_product_total_stock(db: Session, product_id: int) -> float:
    """Calculate total on-hand stock across all INTERNAL physical warehouse locations."""
    internal_loc_ids = [
        loc.id
        for loc in db.query(Location).filter(Location.location_type == "internal").all()
    ]
    if not internal_loc_ids:
        return 0.0

    incoming = (
        db.query(func.coalesce(func.sum(StockMove.quantity), 0.0))
        .filter(
            StockMove.product_id == product_id,
            StockMove.dest_location_id.in_(internal_loc_ids),
            StockMove.status == DocStatus.DONE,
        )
        .scalar()
    )

    outgoing = (
        db.query(func.coalesce(func.sum(StockMove.quantity), 0.0))
        .filter(
            StockMove.product_id == product_id,
            StockMove.source_location_id.in_(internal_loc_ids),
            StockMove.status == DocStatus.DONE,
        )
        .scalar()
    )

    return float(incoming) - float(outgoing)


def create_stock_move(
    db: Session,
    product_id: int,
    source_location_id: int,
    dest_location_id: int,
    quantity: float,
    document_id: int = None,
    reference: str = None,
    status: str = DocStatus.DONE,
) -> StockMove:
    """Execute an atomic double-entry stock ledger transaction."""
    move = StockMove(
        product_id=product_id,
        source_location_id=source_location_id,
        dest_location_id=dest_location_id,
        quantity=quantity,
        document_id=document_id,
        reference=reference,
        status=status,
    )
    db.add(move)
    return move
