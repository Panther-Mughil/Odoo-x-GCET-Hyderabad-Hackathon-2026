import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.database import Base, get_db
from app.models import Product, Location, Warehouse, User, UserRole, ProductCategory
from app.services.seeder import seed_database
from app.routers.auth import hash_password

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    
    # Manually seed a product for operation test
    cat = ProductCategory(name="Test Category")
    db.add(cat)
    db.commit()
    prod = Product(sku="TEST-01", name="Test Product", category_id=cat.id)
    db.add(prod)
    db.commit()
    db.close()
    
    yield
    Base.metadata.drop_all(bind=engine)

def test_kpis_endpoint():
    response = client.get("/api/dashboard/kpis")
    assert response.status_code == 200
    data = response.json()
    assert "total_sku_count" in data

def test_auth_login():
    response = client.post("/api/auth/login", json={"email": "manager@stocksense.com", "password": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["role"] == "inventory_manager"

def test_document_state_machine():
    db = TestingSessionLocal()
    vendor_loc = db.query(Location).filter(Location.full_path == "Vendors/Incoming").first()
    wh_loc = db.query(Location).filter(Location.full_path == "WH1/Main Store").first()
    prod = db.query(Product).first()
    
    res = client.post("/api/operations/receipts", json={
        "supplier_name": "Test Vendor",
        "dest_location_id": wh_loc.id,
        "items": [{"product_id": prod.id, "quantity": 100}]
    })
    assert res.status_code == 200
    doc_num = res.json()["doc_number"]
    
    docs_res = client.get("/api/operations")
    docs = docs_res.json()
    doc_id = next(d["id"] for d in docs if d["doc_number"] == doc_num)
    assert next(d["status"] for d in docs if d["doc_number"] == doc_num) == "draft"
    
    res_ready = client.post(f"/api/operations/{doc_id}/mark_ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "ready"
    
    res_done = client.post(f"/api/operations/{doc_id}/validate")
    assert res_done.status_code == 200
    assert res_done.json()["status"] == "done"

def test_insufficient_stock_delivery_wait_state():
    db = TestingSessionLocal()
    wh_loc = db.query(Location).filter(Location.full_path == "WH1/Main Store").first()
    prod = db.query(Product).first()
    
    res = client.post("/api/operations/deliveries", json={
        "customer_name": "Test Customer",
        "source_location_id": wh_loc.id,
        "items": [{"product_id": prod.id, "quantity": 999999}]
    })
    assert res.status_code == 200
    doc_num = res.json()["doc_number"]
    
    docs = client.get("/api/operations").json()
    doc_id = next(d["id"] for d in docs if d["doc_number"] == doc_num)
    
    res_ready = client.post(f"/api/operations/{doc_id}/mark_ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "waiting"


def test_alerts_and_auto_reorder():
    db = TestingSessionLocal()
    cat = db.query(ProductCategory).first()
    low_prod = Product(sku="ALERT-01", name="Low Stock Item", category_id=cat.id, min_reorder_qty=20.0, target_stock_qty=100.0, cost_price=50.0)
    db.add(low_prod)
    db.commit()
    db.refresh(low_prod)

    res = client.get("/api/alerts/reorder-suggestions")
    assert res.status_code == 200
    suggestions = res.json()
    assert isinstance(suggestions, list)
    assert any(s["sku"] == "ALERT-01" for s in suggestions)
    
    # Auto reorder for the low stock product
    reorder_res = client.post("/api/alerts/auto-reorder", json={"product_id": low_prod.id})
    assert reorder_res.status_code == 200
    data = reorder_res.json()
    assert "doc_number" in data or "message" in data
    assert data["reorder_quantity"] == 100.0

