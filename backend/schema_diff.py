# schema_diff.py
from sqlalchemy import inspect

from app.db.database import engine  # ✅ ya lo creas en database.py
from app.models import models  # ✅ aquí debe estar Base.metadata

insp = inspect(engine)

# Tablas en models
model_tables = {}
for tbl in models.Base.metadata.sorted_tables:
    model_tables[tbl.name] = {c.name: str(c.type) for c in tbl.columns}

# Tablas en BD
db_tables = insp.get_table_names(schema="public")


def norm(t: str) -> str:
    return t.lower().replace(" ", "")


for table in sorted(set(db_tables) | set(model_tables.keys())):
    db_cols = {}
    if table in db_tables:
        for c in insp.get_columns(table, schema="public"):
            db_cols[c["name"]] = str(c["type"])
    mdl_cols = model_tables.get(table, {})

    missing_in_db = sorted(set(mdl_cols) - set(db_cols))
    extra_in_db = sorted(set(db_cols) - set(mdl_cols))
    type_mismatch = []
    for col in sorted(set(mdl_cols) & set(db_cols)):
        if norm(mdl_cols[col]) != norm(db_cols[col]):
            type_mismatch.append((col, mdl_cols[col], db_cols[col]))

    if missing_in_db or extra_in_db or type_mismatch:
        print(f"\n=== {table} ===")
        if missing_in_db:
            print("  Missing in DB:", missing_in_db)
        if extra_in_db:
            print("  Extra in DB:", extra_in_db)
        for col, m, d in type_mismatch:
            print(f"  Type mismatch {col}: model={m} db={d}")
