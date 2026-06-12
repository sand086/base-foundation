import os
import sys
from pathlib import Path

# 1. Asegurar que Python reconozca la estructura de carpetas
CURRENT_DIR = Path(__file__).resolve().parent
sys.path.append(str(CURRENT_DIR))

# 2. Importar los módulos reales de tu aplicación
from app.db.database import SessionLocal
from app.models import models
from app.integrations.sat.billing_service import BillingService


def ejecutar_cancelacion_masiva():
    # Obtener una sesión limpia de la Base de Datos directamente
    db = SessionLocal()
    service = BillingService(db)

    print("\n" + "=" * 60)
    print("🚀 INICIANDO ENVIADOR DE CANCELACIONES EN MASA AL SAT")
    print("=" * 60)

    # Buscar las facturas que están en la fila de espera o canceladas localmente
    facturas_fantasmas = (
        db.query(models.ReceivableInvoice)
        .filter(
            models.ReceivableInvoice.status_sat.in_(
                ["CANCELADO", "PENDIENTE_CANCELAR_SAT"]
            ),
            models.ReceivableInvoice.uuid.isnot(None),
        )
        .all()
    )

    total = len(facturas_fantasmas)
    if total == 0:
        print(
            "✨ Todo limpio. No se encontraron facturas pendientes de procesar en el SAT."
        )
        db.close()
        return

    print(
        f"📦 Se detectaron {total} facturas listas para ser canceladas ante el SAT.\n"
    )

    count = 0
    exitosas = 0
    fallidas = 0

    # Recorrer una por una con impresión inmediata en pantalla
    for fac in facturas_fantasmas:
        count += 1
        print(
            f"[{count}/{total}] 📡 Enviando -> Folio: {fac.folio_interno} | UUID: {fac.uuid}..."
        )

        try:
            # Llama a tu método SOAP oficial conectado al PAC
            res = service.cancelar_factura_sat(invoice_id=fac.id, motivo="02")
            print(f"   ✅ SAT RESPONDIÓ: {res.get('message')}")
            exitosas += 1
        except Exception as e:
            print(f"   ❌ SAT RECHAZÓ: {str(e)}")
            fallidas += 1

    print("\n" + "=" * 60)
    print("🎉 ¡PROCESO DE CANCELACIÓN COMPLETADO EN EL SAT!")
    print(f"   🔹 Total Procesadas: {total}")
    print(f"   🔹 Aceptadas por el SAT: {exitosas}")
    print(f"   🔹 Fallidas / Errores: {fallidas}")
    print("=" * 60 + "\n")

    db.close()


if __name__ == "__main__":
    ejecutar_cancelacion_masiva()
