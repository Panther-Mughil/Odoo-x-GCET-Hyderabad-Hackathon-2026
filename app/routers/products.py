from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, ProductCategory, Location, Warehouse
from app.services.ledger import get_product_location_stock, get_product_total_stock

router = APIRouter(prefix="/api/products", tags=["Products"])

class ProductCreate(BaseModel):
    name: str
    sku: str
    category_name: str
    uom: str = "units"
    cost_price: float = 0.0
    min_reorder_qty: float = 10.0
    target_stock_qty: float = 50.0
    initial_location_id: Optional[int] = None
    initial_stock: Optional[float] = 0.0

@router.get("")
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if category and category != "all":
        query = query.join(ProductCategory).filter(ProductCategory.name == category)
    if search:
        search_fmt = f"%{search.strip().lower()}%"
        query = query.filter(
            (Product.name.ilike(search_fmt)) | (Product.sku.ilike(search_fmt))
        )
    
    products = query.all()
    results = []
    for p in products:
        total_on_hand = get_product_total_stock(db, p.id)
        is_low = total_on_hand <= p.min_reorder_qty
        results.append({
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category.name if p.category else "General",
            "uom": p.uom,
            "cost_price": p.cost_price,
            "min_reorder_qty": p.min_reorder_qty,
            "target_stock_qty": p.target_stock_qty,
            "on_hand": total_on_hand,
            "is_low_stock": is_low,
            "status": "Out of Stock" if total_on_hand == 0 else ("Low Stock" if is_low else "Normal")
        })
    return results

@router.get("/{product_id}/locations")
def product_location_breakdown(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    internal_locs = db.query(Location).filter(Location.location_type == "internal").all()
    breakdown = []
    for loc in internal_locs:
        qty = get_product_location_stock(db, product.id, loc.id)
        breakdown.append({
            "location_id": loc.id,
            "location_name": loc.name,
            "full_path": loc.full_path,
            "warehouse": loc.warehouse.name if loc.warehouse else "N/A",
            "quantity": qty,
            "uom": product.uom
        })
    return {
        "product_id": product.id,
        "product_name": product.name,
        "sku": product.sku,
        "breakdown": breakdown
    }

@router.post("")
def create_product(req: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.sku == req.sku.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists.")
    
    cat = db.query(ProductCategory).filter(ProductCategory.name == req.category_name.strip()).first()
    if not cat:
        cat = ProductCategory(name=req.category_name.strip())
        db.add(cat)
        db.commit()
        db.refresh(cat)

    prod = Product(
        name=req.name.strip(),
        sku=req.sku.strip().upper(),
        category_id=cat.id,
        uom=req.uom,
        cost_price=req.cost_price,
        min_reorder_qty=req.min_reorder_qty,
        target_stock_qty=req.target_stock_qty
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    # If initial stock provided, create initial receipt move from virtual vendor
    if req.initial_stock and req.initial_stock > 0 and req.initial_location_id:
        from app.services.ledger import create_stock_move
        vendor_loc = db.query(Location).filter(Location.full_path == "Vendors/Incoming").first()
        if vendor_loc:
            create_stock_move(
                db=db,
                product_id=prod.id,
                source_location_id=vendor_loc.id,
                dest_location_id=req.initial_location_id,
                quantity=req.initial_stock,
                reference="INIT-STOCK"
            )
            db.commit()

    return {"message": "Product created successfully", "product_id": prod.id}
