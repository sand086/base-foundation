import sys
import os
import datetime

# Asegurar que Python reconozca los módulos de la aplicación
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoice, RecordStatus
from app.integrations.sat.billing_service import BillingService
from app.modules.logistics.schemas import ReceivableInvoiceCreate


def ejecutar_sustitucion():
    db = SessionLocal()
    try:
        uuid_a_sustituir = "423DE075-C083-4A84-82BA-9A918B8771EC"
        folio_objetivo = "18363"

        print(f"🔍 1. Buscando factura cancelada en BD (UUID {uuid_a_sustituir})...")
        factura_vieja = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == uuid_a_sustituir)
            .first()
        )

        if not factura_vieja:
            print("❌ No se encontró la factura cancelada en la base de datos.")
            return

        viaje_id_objetivo = factura_vieja.viaje_id

        if not viaje_id_objetivo:
            print("❌ La factura vieja no tiene un viaje asociado (viaje_id es None).")
            return

        print(
            f"🛠️ 2. Liberando el Viaje {viaje_id_objetivo} y reasignando folio viejo..."
        )
        # Renombramos el folio de la cancelada para liberar '18363'
        factura_vieja.folio_interno = f"CP-{folio_objetivo}-CANCELADA"
        factura_vieja.viaje_id = None
        factura_vieja.record_status = RecordStatus.ELIMINADO
        db.add(factura_vieja)
        db.commit()
        print("✅ Viaje y Folio liberados correctamente en la BD.")

        print(
            f"🚀 3. Timbrando sustituta con BillingService para el Viaje {viaje_id_objetivo}..."
        )
        billing_service = BillingService(db)

        # Construcción del payload oficial relacionando con tipo 04
        payload = ReceivableInvoiceCreate(
            viaje_id=viaje_id_objetivo, uuid_relacionado=uuid_a_sustituir
        )
        # Inyección dinámica del folio deseado
        setattr(payload, "folio_forzado", folio_objetivo)

        # Invocación del motor oficial de timbrado One-Shot
        nueva_factura = billing_service.generar_carta_porte_one_shot(
            invoice_data=payload
        )

        # 🚀 TRUCO AUTOMÁTICO: Planchamos la fecha a la original para tu sistema
        nueva_factura.fecha_emision = datetime.date(2026, 8, 3)
        db.commit()

        print("\n" + "=" * 60)
        print("🎉 ¡PROCESO DE SUSTITUCIÓN COMPLETADO CON ÉXITO!")
        print("=" * 60)
        print(f"• ID Nueva Factura BD : {nueva_factura.id}")
        print(f"• Folio Asignado      : {nueva_factura.folio_interno}")
        print(f"• Nuevo UUID (SAT)    : {nueva_factura.uuid}")
        print(f"• UUID Relacionado 04 : {nueva_factura.uuid_relacionado}")
        print(f"• Asignada al Viaje   : {nueva_factura.viaje_id}")
        print("=" * 60)
        print(
            "👉 La nueva factura está timbrada y con fecha del 3 de agosto en sistema."
        )

    except Exception as e:
        db.rollback()
        print(f"\n🔥 ERROR CATASTRÓFICO DURANTE EL PROCESO:")
        print(f"   {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    ejecutar_sustitucion()
