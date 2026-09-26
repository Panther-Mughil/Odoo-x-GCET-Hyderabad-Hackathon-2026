import re

with open("app/routers/auth.py", "r") as f:
    code = f.read()

# Strip out the old register_user block
parts = code.split('@router.post("/login")')
head = parts[0]
tail = '@router.post("/login")' + parts[1]

# Rebuild head without the old register function
head_parts = head.split('@router.post("/register")')
imports = head_parts[0]

new_register = """
@router.post("/register")
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    # SECURITY FIX: First user is admin, everyone else defaults to staff.
    is_first_user = db.query(User).count() == 0
    assigned_role = "admin" if is_first_user else UserRole.STAFF
    
    user = User(
        email=req.email.strip().lower(),
        password=pwd_context.hash(req.password),
        full_name=req.full_name,
        role=assigned_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "User registered successfully",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role},
    }

"""

with open("app/routers/auth.py", "w") as f:
    f.write(imports + new_register + tail)

# Now fix the frontend to remove the dropdown
with open("frontend/index.html", "r") as f:
    html = f.read()

dropdown = """<div style="text-align: left; margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Role</label>
        <select id="signup-role" style="width: 100%; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 14px; background: white;" required>
          <option value="warehouse_staff">Warehouse Staff</option>
          <option value="inventory_manager">Inventory Manager</option>
          <option value="admin">System Admin</option>
        </select>
      </div>"""

html = html.replace(dropdown, "")

with open("frontend/index.html", "w") as f:
    f.write(html)
