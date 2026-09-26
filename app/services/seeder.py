from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models import (
    User,
    Warehouse,
    Location,
    ProductCategory,
    Product,
    OperationDocument,
    StockMove,
    UserRole,
    DocType,
    DocStatus,
)
from app.services.ledger import create_stock_move

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_database(db: Session, force: bool = False):
    if not force and db.query(Product).first():
        return

    # Clear existing if force
    if force:
        db.query(StockMove).delete()
        db.query(OperationDocument).delete()
        db.query(Product).delete()
        db.query(ProductCategory).delete()
        db.query(Location).delete()
        db.query(Warehouse).delete()
        db.query(User).delete()
        db.commit()

    # 1. Seed Users
    manager = User(
        email="manager@stocksense.com",
        password=pwd_context.hash("admin"),
        full_name="Alex Vance",
        role=UserRole.MANAGER,
    )
    staff = User(
        email="staff@stocksense.com",
        password=pwd_context.hash("admin"),
        full_name="Jordan Cole",
        role=UserRole.STAFF,
    )
    db.add_all([manager, staff])
    db.commit()

    # 2. Seed Warehouses
    wh1 = Warehouse(code="WH1", name="Main Warehouse", address="Sector 4 Industrial Corridor, Chennai")
    wh2 = Warehouse(code="WH2", name="Production Store", address="Building B, Gate 2, Assembly Zone")
    wh3 = Warehouse(code="WH3", name="Dispatch Center", address="Highway Logistics Hub, North Wing")
    db.add_all([wh1, wh2, wh3])
    db.commit()

    # 3. Seed Physical Locations
    loc_main_store = Location(warehouse_id=wh1.id, name="Main Store", full_path="WH1/Main Store", location_type="internal")
    loc_rack_a = Location(warehouse_id=wh1.id, name="Rack A", full_path="WH1/Rack A", location_type="internal")
    loc_rack_b = Location(warehouse_id=wh1.id, name="Rack B", full_path="WH1/Rack B", location_type="internal")
    loc_prod_rack = Location(warehouse_id=wh2.id, name="Production Rack", full_path="WH2/Production Rack", location_type="internal")
    loc_wh2_rec = Location(warehouse_id=wh2.id, name="Assembly Storage", full_path="WH2/Assembly Storage", location_type="internal")
    loc_wh3_bay = Location(warehouse_id=wh3.id, name="Dispatch Bay 1", full_path="WH3/Dispatch Bay 1", location_type="internal")

    # Virtual Locations
    loc_vendor = Location(name="Vendor Receiving", full_path="Vendors/Incoming", location_type="vendor")
    loc_customer = Location(name="Customer Dispatch", full_path="Customers/Outgoing", location_type="customer")
    loc_loss = Location(name="Loss & Damaged Scrap", full_path="Virtual/Loss & Scrap", location_type="virtual")

    db.add_all([
        loc_main_store, loc_rack_a, loc_rack_b, loc_prod_rack, loc_wh2_rec, loc_wh3_bay,
        loc_vendor, loc_customer, loc_loss
    ])
    db.commit()

    # 4. Product Categories
    cat_acc = ProductCategory(name="Accessories")
    cat_elec = ProductCategory(name="Electronics")
    cat_metals = ProductCategory(name="Raw Metals")
    cat_furniture = ProductCategory(name="Furniture")
    cat_hardware = ProductCategory(name="Hardware")
    db.add_all([cat_acc, cat_elec, cat_metals, cat_furniture, cat_hardware])
    db.commit()

    # 5. Products
    prod_mouse = Product(
        sku="WM-1042",
        name="Wireless Mouse",
        category_id=cat_acc.id,
        uom="units",
        cost_price=650.0,
        min_reorder_qty=50.0,
        target_stock_qty=120.0
    )
    prod_kbd = Product(
        sku="KB-2011",
        name="Mechanical Keyboard",
        category_id=cat_acc.id,
        uom="units",
        cost_price=2400.0,
        min_reorder_qty=30.0,
        target_stock_qty=80.0
    )
    prod_hub = Product(
        sku="UH-3320",
        name="USB-C Hub",
        category_id=cat_elec.id,
        uom="units",
        cost_price=1200.0,
        min_reorder_qty=20.0,
        target_stock_qty=50.0
    )
    prod_hdmi = Product(
        sku="HD-4012",
        name="HDMI Cable 2.1",
        category_id=cat_elec.id,
        uom="units",
        cost_price=350.0,
        min_reorder_qty=25.0,
        target_stock_qty=100.0
    )
    prod_stand = Product(
        sku="LS-5020",
        name="Aluminum Laptop Stand",
        category_id=cat_acc.id,
        uom="units",
        cost_price=1800.0,
        min_reorder_qty=10.0,
        target_stock_qty=40.0
    )
    prod_eth = Product(
        sku="EC-6010",
        name="Ethernet Cable Cat6 (10m)",
        category_id=cat_elec.id,
        uom="units",
        cost_price=220.0,
        min_reorder_qty=40.0,
        target_stock_qty=200.0
    )
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
        cost_price=3200.0,
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
    db.add_all([prod_mouse, prod_kbd, prod_hub, prod_hdmi, prod_stand, prod_eth, prod_steel, prod_chairs, prod_bolts])
    db.commit()

    # 6. Seed Initial Stock & Operation Documents
    # Stock for Mouse
    create_stock_move(db, prod_mouse.id, loc_vendor.id, loc_rack_a.id, 42.0, None, "INIT-WM")
    # Stock for Keyboard
    create_stock_move(db, prod_kbd.id, loc_vendor.id, loc_rack_b.id, 8.0, None, "INIT-KB")
    # Stock for USB Hub
    create_stock_move(db, prod_hub.id, loc_vendor.id, loc_rack_a.id, 3.0, None, "INIT-HUB")
    # Stock for HDMI Cable
    create_stock_move(db, prod_hdmi.id, loc_vendor.id, loc_main_store.id, 85.0, None, "INIT-HDMI")
    # Stock for Laptop Stand
    create_stock_move(db, prod_stand.id, loc_vendor.id, loc_rack_b.id, 24.0, None, "INIT-LS")
    # Stock for Ethernet
    create_stock_move(db, prod_eth.id, loc_vendor.id, loc_main_store.id, 150.0, None, "INIT-ETH")
    # Stock for Chairs
    create_stock_move(db, prod_chairs.id, loc_vendor.id, loc_main_store.id, 18.0, None, "INIT-CHR")
    # Stock for Bolts
    create_stock_move(db, prod_bolts.id, loc_vendor.id, loc_rack_a.id, 8.0, None, "INIT-BLT")

    # Document 1: Completed Receipt
    doc1 = OperationDocument(
        doc_number="REC-1001",
        doc_type=DocType.RECEIPT,
        status=DocStatus.DONE,
        partner_name="TechSource Electronics",
        source_location_id=loc_vendor.id,
        dest_location_id=loc_main_store.id,
        notes="Q3 Electronics replenishment order",
    )
    db.add(doc1)
    db.flush()
    create_stock_move(db, prod_steel.id, loc_vendor.id, loc_main_store.id, 100.0, doc1.id, "REC-1001")

    # Document 2: Completed Internal Transfer
    doc2 = OperationDocument(
        doc_number="INT-1001",
        doc_type=DocType.INTERNAL,
        status=DocStatus.DONE,
        partner_name="Assembly Replenishment",
        source_location_id=loc_main_store.id,
        dest_location_id=loc_prod_rack.id,
        notes="Transfer steel to production rack",
    )
    db.add(doc2)
    db.flush()
    create_stock_move(db, prod_steel.id, loc_main_store.id, loc_prod_rack.id, 50.0, doc2.id, "INT-1001")

    # Document 3: Completed Delivery
    doc3 = OperationDocument(
        doc_number="DEL-1001",
        doc_type=DocType.DELIVERY,
        status=DocStatus.DONE,
        partner_name="ABC Electronics Ltd",
        source_location_id=loc_prod_rack.id,
        dest_location_id=loc_customer.id,
        notes="Customer order fulfillment",
    )
    db.add(doc3)
    db.flush()
    create_stock_move(db, prod_steel.id, loc_prod_rack.id, loc_customer.id, 20.0, doc3.id, "DEL-1001")

    # Document 4: Completed Adjustment
    doc4 = OperationDocument(
        doc_number="ADJ-1001",
        doc_type=DocType.ADJUSTMENT,
        status=DocStatus.DONE,
        partner_name="Cycle Count Audit",
        source_location_id=loc_prod_rack.id,
        dest_location_id=loc_loss.id,
        notes="Damaged inventory scrap write-off",
    )
    db.add(doc4)
    db.flush()
    create_stock_move(db, prod_steel.id, loc_prod_rack.id, loc_loss.id, 3.0, doc4.id, "ADJ-1001")

    # Pending Operations for testing
    doc5 = OperationDocument(
        doc_number="REC-1002",
        doc_type=DocType.RECEIPT,
        status=DocStatus.READY,
        partner_name="Metro Supplies India",
        source_location_id=loc_vendor.id,
        dest_location_id=loc_rack_a.id,
        notes="Incoming shipment ready for inspection",
    )
    db.add(doc5)

    doc6 = OperationDocument(
        doc_number="DEL-1002",
        doc_type=DocType.DELIVERY,
        status=DocStatus.READY,
        partner_name="XYZ Retail Store",
        source_location_id=loc_rack_a.id,
        dest_location_id=loc_customer.id,
        notes="Ready for dispatch packing",
    )
    db.add(doc6)

    db.commit()
