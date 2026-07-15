import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.integrations.sat.billing_service import BillingService

db = SessionLocal()
try:
    bs = BillingService(db)
    # Llamamos a la función mágica que sí tiene el mapeo del folio fijo
    res = bs.regenerar_pdf_factura(756)
    print("🔥 Resultado:", res)
finally:
    db.close()
