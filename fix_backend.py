import sys

with open("app/routers/operations.py", "r") as f:
    content = f.read()

# Fix create_receipt
content = content.replace("status=DocStatus.READY,", "status=DocStatus.DRAFT,")
content = content.replace("doc.status = DocStatus.DONE # Validated and stock incremented", "doc.status = DocStatus.DRAFT")
content = content.replace("Receipt validated and stock incremented", "Receipt draft created successfully")

# Fix create_delivery
import re
# Remove the availability check in create_delivery
availability_check_pattern = r"    # Availability Check\n.*?doc_num ="
content = re.sub(availability_check_pattern, "    doc_num =", content, flags=re.DOTALL)
content = content.replace("status=DocStatus.DONE,\n        partner_name=req.customer_name", "status=DocStatus.DRAFT,\n        partner_name=req.customer_name")
content = content.replace("Delivery validated and stock decremented", "Delivery draft created successfully")

# Fix create_internal_transfer
transfer_availability_check = r"    for item in req.items:\n.*?doc_num ="
content = re.sub(transfer_availability_check, "    doc_num =", content, flags=re.DOTALL)
content = content.replace("status=DocStatus.DONE,\n        partner_name=\"Internal Movement\"", "status=DocStatus.DRAFT,\n        partner_name=\"Internal Movement\"")
content = content.replace("Internal transfer completed successfully", "Internal transfer draft created")

# We need to add the new endpoints
new_endpoints = """
@router.post("/{doc_id}/mark_ready")
def mark_ready(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(OperationDocument).filter(OperationDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.status == DocStatus.DONE:
        raise HTTPException(status_code=400, detail="Document is already done")
        
    new_status = DocStatus.READY
    
    # If it's a delivery or internal transfer, check stock
    if doc.doc_type in (DocType.DELIVERY, DocType.INTERNAL):
        for move in doc.moves:
            available = get_product_location_stock(db, move.product_id, move.source_location_id)
            if available < move.quantity:
                new_status = DocStatus.WAITING
                break
                
    doc.status = new_status
    for move in doc.moves:
        move.status = new_status
        
    db.commit()
    return {"message": f"Document marked as {new_status}", "status": new_status}

@router.post("/{doc_id}/validate")
def validate_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(OperationDocument).filter(OperationDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.status == DocStatus.WAITING:
        raise HTTPException(status_code=400, detail="Cannot validate while waiting for stock")
        
    if doc.status == DocStatus.DONE:
        raise HTTPException(status_code=400, detail="Already validated")
        
    # Re-verify stock right before validation just in case
    if doc.doc_type in (DocType.DELIVERY, DocType.INTERNAL):
        for move in doc.moves:
            available = get_product_location_stock(db, move.product_id, move.source_location_id)
            if available < move.quantity:
                doc.status = DocStatus.WAITING
                for m in doc.moves: m.status = DocStatus.WAITING
                db.commit()
                raise HTTPException(status_code=400, detail="Insufficient stock. Status reverted to WAITING.")

    doc.status = DocStatus.DONE
    for move in doc.moves:
        move.status = DocStatus.DONE
        
    db.commit()
    return {"message": "Document validated successfully", "status": DocStatus.DONE}

def random_suffix():
"""
content = content.replace("def random_suffix():", new_endpoints)

with open("app/routers/operations.py", "w") as f:
    f.write(content)
