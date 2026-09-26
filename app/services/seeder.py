from sqlalchemy.orm import Session
from app.models import Warehouse, Location, User, UserRole
from app.routers.auth import hash_password

def seed_database(db: Session):
    # 1. Seed initial users if none exist
    if not db.query(User).filter(User.email == "manager@stocksense.com").first():
        manager = User(
            email="manager@stocksense.com",
            password=hash_password("admin"),
            full_name="Rajesh Sharma",
            role=UserRole.MANAGER,
        )
        staff = User(
            email="staff@stocksense.com",
            password=hash_password("admin"),
            full_name="Priya Patel",
            role=UserRole.STAFF,
        )
        db.add_all([manager, staff])
        db.commit()

    # 2. Check if infrastructure is already seeded
    if db.query(Warehouse).first():
        return

    # 3. Structural Warehouse & Locations (Required for the app to function)
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
    print("Database structural seeding complete.")
