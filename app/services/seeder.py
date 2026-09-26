from sqlalchemy.orm import Session
from app.models import Warehouse, Location

def seed_database(db: Session):
    # Check if infrastructure is already seeded
    if db.query(Warehouse).first():
        return

    # 1. Structural Warehouse & Locations (Required for the app to function)
    wh = Warehouse(code="WH1", name="Main Warehouse", address="123 Tech Park")
    db.add(wh)
    db.commit()

    locs = [
        Location(warehouse_id=wh.id, name="Main Store", full_path="WH1/Main Store", location_type="internal"),
        Location(warehouse_id=wh.id, name="Production Rack", full_path="WH1/Production Rack", location_type="internal"),
        Location(warehouse_id=None, name="Vendors", full_path="Vendors/Incoming", location_type="vendor"),
        Location(warehouse_id=None, name="Customers", full_path="Customers/Outgoing", location_type="customer"),
        Location(warehouse_id=None, name="Scrap", full_path="Virtual/Loss & Scrap", location_type="virtual")
    ]
    db.add_all(locs)
    db.commit()
    print("Database structural seeding complete (No dummy data added).")
