import re

# Fix auth.py
with open("app/routers/auth.py", "r") as f:
    auth_code = f.read()
auth_code = auth_code.replace("import random", "import secrets")
auth_code = auth_code.replace("random.randint(100000, 999999)", "secrets.randbelow(900000) + 100000")
with open("app/routers/auth.py", "w") as f:
    f.write(auth_code)

# Fix seeder.py
with open("app/services/seeder.py", "r") as f:
    seeder_code = f.read()
seeder_code = "from passlib.context import CryptContext\npwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')\n" + seeder_code
seeder_code = seeder_code.replace('password="admin"', 'password=pwd_context.hash("admin")')
with open("app/services/seeder.py", "w") as f:
    f.write(seeder_code)

