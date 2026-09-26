import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole:
    MANAGER = "inventory_manager"
    STAFF = "warehouse_staff"

class DocType:
    RECEIPT = "receipt"
    DELIVERY = "delivery"
    INTERNAL = "internal"
    ADJUSTMENT = "adjustment"

class DocStatus:
    DRAFT = "draft"
    WAITING = "waiting"
    READY = "ready"
    DONE = "done"
    CANCELED = "canceled"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default=UserRole.STAFF)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class OTPToken(Base):
    __tablename__ = "otp_tokens"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Integer, default=0)

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    locations = relationship("Location", back_populates="warehouse")

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    name = Column(String, nullable=False)
    full_path = Column(String, unique=True, index=True, nullable=False) # e.g. WH1/Main Store, Vendors/Incoming
    location_type = Column(String, default="internal") # internal, vendor, customer, virtual
    warehouse = relationship("Warehouse", back_populates="locations")

class ProductCategory(Base):
    __tablename__ = "product_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    uom = Column(String, default="units") # kg, units, meters, etc.
    min_reorder_qty = Column(Float, default=10.0)
    target_stock_qty = Column(Float, default=50.0)
    cost_price = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    category = relationship("ProductCategory", back_populates="products")
    moves = relationship("StockMove", back_populates="product")

class OperationDocument(Base):
    __tablename__ = "operation_documents"
    id = Column(Integer, primary_key=True, index=True)
    doc_number = Column(String, unique=True, index=True, nullable=False) # e.g. REC-2026-001, DEL-2026-001
    doc_type = Column(String, nullable=False) # receipt, delivery, internal, adjustment
    status = Column(String, default=DocStatus.DRAFT) # draft, waiting, ready, done, canceled
    partner_name = Column(String, nullable=True) # Vendor name or Customer name
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    dest_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    notes = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    source_location = relationship("Location", foreign_keys=[source_location_id])
    dest_location = relationship("Location", foreign_keys=[dest_location_id])
    user = relationship("User")
    moves = relationship("StockMove", back_populates="document", cascade="all, delete-orphan")

class StockMove(Base):
    __tablename__ = "stock_moves"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("operation_documents.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    dest_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    status = Column(String, default=DocStatus.DONE) # done or canceled
    reference = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("OperationDocument", back_populates="moves")
    product = relationship("Product", back_populates="moves")
    source_location = relationship("Location", foreign_keys=[source_location_id])
    dest_location = relationship("Location", foreign_keys=[dest_location_id])
