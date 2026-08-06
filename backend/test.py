import sys
import os

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService
from zeep import Client

db = SessionLocal()
service = PaymentComplementService(db)
wsdl = service.wsdl_timbrado

print("=" * 60)
print(f"WSDL Cargado en tu base de datos: {wsdl}")
print("=" * 60)
client = Client(wsdl)

print("\n✅ MÉTODOS DISPONIBLES EN ESTE WEBSERVICE:")
for service_name, service_obj in client.wsdl.services.items():
    for port_name, port_obj in service_obj.ports.items():
        print(f"\n➡️  Puerto: {port_name}")
        for op_name, op_obj in port_obj.binding._operations.items():
            print(f"   - {op_name}")
print("=" * 60)
