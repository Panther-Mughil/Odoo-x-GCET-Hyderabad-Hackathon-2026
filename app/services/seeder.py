from sqlalchemy.orm import Session
from app.models import User, Warehouse, Location, ProductCategory, Product, OperationDocument, StockMove, UserRole, DocType, DocStatus
from app.services.ledger import create_stock_move

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Product).first():
        return

    # 1. Seed Users (Manager & Staff)
    manager = User(
        email="manager@stocksense.com",
        password="admin",
        full_name="Alex Vance (Inventory Manager)",
        role=UserRole.MANAGER
    )
    staff = User(
        email="staff@stocksense.com",
        password="admin",
        full_name="Jordan Cole (Warehouse Staff)",
        role=UserRole.STAFF
    )
    db.add_all([manager, staff])
    db.commit()

    # 2. Seed Warehouses
    wh1 = Warehouse(code="WH1", name="Main Central Logistics", address="Sector 4 Industrial Area")
    wh2 = Warehouse(code="WH2", name="Production & Assembly Hub", address="Building B, Gate 2")
    db.add_all([wh1, wh2])
    db.commit()

    # 3. Seed Physical Locations (Internal)
    loc_main_store = Location(warehouse_id=wh1.id, name="Main Store", full_path="WH1/Main Store", location_type="internal")
    loc_rack_a = Location(warehouse_id=wh1.id, name="Rack A", full_path="WH1/Rack A", location_type="internal")
    loc_rack_b = Location(warehouse_id=wh1.id, name="Rack B", full_path="WH1/Rack B", location_type="internal")
    loc_prod_rack = Location(warehouse_id=wh2.id, name="Production Rack", full_path="WH2/Production Rack", location_type="internal")
    loc_wh2_rec = Location(warehouse_id=wh2.id, name="Assembly Storage", full_path="WH2/Assembly Storage", location_type="internal")

    # Virtual Locations
    loc_vendor = Location(name="Vendor Receiving", full_path="Vendors/Incoming", location_type="vendor")
    loc_customer = Location(name="Customer Dispatch", full_path="Customers/Outgoing", location_type="customer")
    loc_loss = Location(name="Loss & Damaged Scrap", full_path="Virtual/Loss & Scrap", location_type="virtual")

    db.add_all([
        loc_main_store, loc_rack_a, loc_rack_b, loc_prod_rack, loc_wh2_rec,
        loc_vendor, loc_customer, loc_loss
    ])
    db.commit()

    # 4. Seed Product Categories
    cat_metals = ProductCategory(name="Raw Metals")
    cat_furniture = ProductCategory(name="Furniture & Frames")
    cat_hardware = ProductCategory(name="Hardware & Fasteners")
    db.add_all([cat_metals, cat_furniture, cat_hardware])
    db.commit()

    # 5. Seed Products (matching PDF problem statement flow)
    prod_steel = Product(
        sku="STL-100-KG",
        name="Structural Steel Rods",
        category_id=cat_metals.id,
        uom="kg",
        cost_price=45.0,
        min_reorder_qty=20.0,
        target_stock_qty=150.0
    )
    prod_chairs = Product(
        sku="CHR-ERG-BLK",
        name="Ergonomic Warehouse Chairs",
        category_id=cat_furniture.id,
        uom="units",
        cost_price=120.0,
        min_reorder_qty=5.0,
        target_stock_qty=25.0
    )
    prod_bolts = Product(
        sku="BLT-M8-100",
        name="M8 Industrial Bolts (Box of 100)",
        category_id=cat_hardware.id,
        uom="boxes",
        cost_price=15.0,
        min_reorder_qty=15.0,
        target_stock_qty=80.0
    )
    db.add_all([prod_steel, prod_chairs, prod_bolts])
    db.commit()

    # 6. Execute the EXACT lifecycle flow from the Problem Statement PDF:
    # Step 1: Receive 100 kg Steel from Vendor -> Main Store
    doc1 = OperationDocument(
        doc_number="REC-2026-0001",
        doc_type=DocType.RECEIPT,
        status=DocStatus.DONE,
        partner_name="ArcelorMittal Steel Ltd",
        source_location_id=loc_vendor.id,
        dest_location_id=loc_main_store.id,
        notes="Hackathon Problem Statement Step 1: Initial vendor intake"
    )
    db.add(doc1)
    db.flush()
    create_stock_move(db, prod_steel.id, loc_vendor.id, loc_main_store.id, 100.0, doc1.id, "REC-2026-0001")

    # Step 2: Internal Transfer: Move 50 kg Steel from Main Store -> Production Rack
    doc2 = OperationDocument(
        doc_number="INT-2026-0001",
        doc_type=DocType.INTERNAL,
        status=DocStatus.DONE,
        partner_name="Production Replenishment",
        source_location_id=loc_main_store.id,
        dest_location_id=loc_prod_rack.id,
        notes="Hackathon Problem Statement Step 2: Move to production rack"
    )
    db.add(doc2)
    db.flush()
    create_stock_move(db, prod_steel.id, loc_main_store.id, loc_prod_rack.id, 50.0, doc2.id, "INT-2026-0001")

    # Step 3: Deliver 20 kg Steel to Customer
    doc3 = OperationDocument(
        doc_number="DEL-2026-0001",
        doc_type=DocType.DELIVERY,
        status=DocStatus.DONE,
        partner_name="Metro Frame Works Inc",
        source_location_id=loc_prod_rack.id,
        dest_location_id=loc_customer.id,
        notes="Hackathon Problem Statement Step 3: Deliver finished goods"
    )
    db.add(doc3)
    db.flush()
    create_stock_move(db, prod_steel.id, loc_prod_rack.id, loc_customer.id, 20.0, doc3.id, "DEL-2026-0001")

    # Step 4: Adjust 3 kg damaged steel -> Virtual/Loss
    doc4 = OperationDocument(
        doc_number="ADJ-2026-0001",
        doc_type=DocType.ADJUSTMENT,
        status=DocStatus.DONE,
        partner_name="Audit: Damaged Material",
        source_location_id=loc_prod_rack.id,
        dest_location_id=loc_loss.id,
        notes="Hackathon Problem Statement Step 4: 3 kg damaged write-off"
    )
    db.add(doc4)
    db.flush()
    create_stock_move(db, prod_steel.id, loc_prod_rack.id, loc_loss.id, 3.0, doc4.id, "ADJ-2026-0001")

    # Add Chairs inventory
    create_stock_move(db, prod_chairs.id, loc_vendor.id, loc_main_store.id, 18.0, None, "INIT-CHR")
    # Add Bolts inventory (Low Stock to trigger alert)
    create_stock_move(db, prod_bolts.id, loc_vendor.id, loc_rack_a.id, 8.0, None, "INIT-BLT")

    db.commit()
