with open("app/routers/auth.py", "r") as f: content = f.read()
if "from passlib.context import CryptContext" not in content:
    content = "from passlib.context import CryptContext\npwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')\n" + content
    
content = content.replace(
    "if not user or user.password != req.password:",
    "if not user or not pwd_context.verify(req.password, user.password):"
)
with open("app/routers/auth.py", "w") as f: f.write(content)
