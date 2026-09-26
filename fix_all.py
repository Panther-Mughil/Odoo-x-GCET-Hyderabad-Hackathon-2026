import sys

# 1. auth.py
with open("app/routers/auth.py", "r") as f: content = f.read()
content = content.replace("import random", "import secrets")
content = content.replace("random.randint(100000, 999999)", "secrets.randbelow(900000) + 100000")
with open("app/routers/auth.py", "w") as f: f.write(content)

# 2. seeder.py
with open("app/services/seeder.py", "r") as f: content = f.read()
if "CryptContext" not in content:
    content = "from passlib.context import CryptContext\npwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')\n" + content
    content = content.replace('password="admin"', 'password=pwd_context.hash("admin")')
    with open("app/services/seeder.py", "w") as f: f.write(content)

# 3. ledger.py
with open("app/services/ledger.py", "r") as f: content = f.read()
content = content.replace("reference: str = None\n) -> StockMove:", "reference: str = None,\n    status: str = DocStatus.DONE\n) -> StockMove:")
content = content.replace("status=DocStatus.DONE\n    )", "status=status\n    )")
with open("app/services/ledger.py", "w") as f: f.write(content)

# 4. operations.py
with open("app/routers/operations.py", "r") as f: content = f.read()

# Replace status in create_receipt
content = content.replace("status=DocStatus.READY,", "status=DocStatus.DRAFT,")
content = content.replace("doc.status = DocStatus.DONE # Validated and stock incremented", "doc.status = DocStatus.DRAFT")
content = content.replace('return {"message": "Receipt validated and stock incremented"', 'return {"message": "Receipt draft created successfully"')

# Replace status in create_delivery
content = content.replace("status=DocStatus.DONE,\n        partner_name=req.customer_name", "status=DocStatus.DRAFT,\n        partner_name=req.customer_name")
content = content.replace('return {"message": "Delivery validated and stock decremented"', 'return {"message": "Delivery draft created successfully"')

# Remove Availability Check block in create_delivery safely
del_block = """    # Availability Check
    for item in req.items:
        available = get_product_location_stock(db, item.product_id, req.source_location_id)
        if available < item.quantity:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {prod.name}. Available: {available}, Required: {item.quantity}"
            )"""
content = content.replace(del_block, "")

# Replace status in create_internal_transfer
content = content.replace("status=DocStatus.DONE,\n        partner_name=\"Internal Movement\"", "status=DocStatus.DRAFT,\n        partner_name=\"Internal Movement\"")
content = content.replace('return {"message": "Internal transfer completed successfully"', 'return {"message": "Internal transfer draft created"')

# Remove Availability Check block in create_internal_transfer safely
trans_block = """    for item in req.items:
        available = get_product_location_stock(db, item.product_id, req.source_location_id)
        if available < item.quantity:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transfer {prod.name}. Available at source: {available}, Requested: {item.quantity}"
            )"""
content = content.replace(trans_block, "")

# Update the create_stock_move calls in operations.py to pass DRAFT
content = content.replace("reference=doc_num\n        )", "reference=doc_num,\n            status=DocStatus.DRAFT\n        )")


# Append new endpoints
new_endpoints = """
@router.post("/{doc_id}/mark_ready")
def mark_ready(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(OperationDocument).filter(OperationDocument.id == doc_id).first()
    if not doc: raise HTTPException(status_code=404, detail="Document not found")
    if doc.status == DocStatus.DONE: raise HTTPException(status_code=400, detail="Document is already done")
    new_status = DocStatus.READY
    if doc.doc_type in (DocType.DELIVERY, DocType.INTERNAL):
        for move in doc.moves:
            available = get_product_location_stock(db, move.product_id, move.source_location_id)
            if available < move.quantity:
                new_status = DocStatus.WAITING
                break
    doc.status = new_status
    for move in doc.moves: move.status = new_status
    db.commit()
    return {"message": f"Document marked as {new_status}", "status": new_status}

@router.post("/{doc_id}/validate")
def validate_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(OperationDocument).filter(OperationDocument.id == doc_id).first()
    if not doc: raise HTTPException(status_code=404, detail="Document not found")
    if doc.status == DocStatus.WAITING: raise HTTPException(status_code=400, detail="Cannot validate while waiting")
    if doc.status == DocStatus.DONE: raise HTTPException(status_code=400, detail="Already validated")
    if doc.doc_type in (DocType.DELIVERY, DocType.INTERNAL):
        for move in doc.moves:
            available = get_product_location_stock(db, move.product_id, move.source_location_id)
            if available < move.quantity:
                doc.status = DocStatus.WAITING
                for m in doc.moves: m.status = DocStatus.WAITING
                db.commit()
                raise HTTPException(status_code=400, detail="Insufficient stock.")
    doc.status = DocStatus.DONE
    for move in doc.moves: move.status = DocStatus.DONE
    db.commit()
    return {"message": "Document validated successfully", "status": DocStatus.DONE}

def random_suffix():
"""
content = content.replace("def random_suffix():", new_endpoints)

with open("app/routers/operations.py", "w") as f: f.write(content)

