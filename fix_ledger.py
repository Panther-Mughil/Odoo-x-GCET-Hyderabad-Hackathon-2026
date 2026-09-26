import sys

with open("app/services/ledger.py", "r") as f:
    content = f.read()

content = content.replace("def create_stock_move(", "def create_stock_move(")
# We need to change the signature of create_stock_move
content = content.replace(
    "reference: str = None\n) -> StockMove:",
    "reference: str = None,\n    status: str = DocStatus.DONE\n) -> StockMove:"
)
content = content.replace("status=DocStatus.DONE\n    )", "status=status\n    )")

with open("app/services/ledger.py", "w") as f:
    f.write(content)

with open("app/routers/operations.py", "r") as f:
    op_content = f.read()
op_content = op_content.replace(
    "reference=doc_num\n        )",
    "reference=doc_num,\n            status=DocStatus.DRAFT\n        )"
)
with open("app/routers/operations.py", "w") as f:
    f.write(op_content)

