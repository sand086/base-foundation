import sys
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def cancelar_uuids_especificos():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🚀 INICIANDO CANCELACIÓN DE UUIDS ESPECÍFICOS")
    print("=" * 80)

    # 📌 LISTA DE UUIDS A CANCELAR
    uuids_a_cancelar = [
        "B9BB1E49-87B9-42A9-A867-2AFB0BA38C2A",
        "FFDE385D-EBA7-490D-9458-4B7125E601E2",
    ]

    for uuid_obj in uuids_a_cancelar:
        print(f"\n🔍 Buscando UUID: {uuid_obj}")

        # 1. Buscar en BD
        factura = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == uuid_obj)
            .first()
        )

        if factura:
            print(
                f"✅ Factura encontrada en BD. Folio interno: {factura.folio_interno}"
            )
            try:
                # Disparamos la cancelación con Motivo 02 (Errores sin relación) usando tu método actual
                service.cancelar_factura_sat(
                    invoice_id=factura.id, motivo="02", uuid_sustituto=None
                )
                print(f"✅ ¡ÉXITO! UUID {uuid_obj} cancelado ante el SAT.")

                # Actualizar estado en BD
                factura.status_sat = "CANCELADO"
                factura.estatus = "cancelado"
                db.commit()
                print("💾 Estatus actualizado a CANCELADO en la base de datos.")

            except Exception as e:
                error_msg = str(e).lower()
                if (
                    "ya se encuentra cancelado" in error_msg
                    or "comprobante cancelado" in error_msg
                ):
                    print(
                        f"ℹ️ El SAT informa que el UUID {uuid_obj} YA ESTABA CANCELADO. Sincronizando BD..."
                    )
                    factura.status_sat = "CANCELADO"
                    factura.estatus = "cancelado"
                    db.commit()
                else:
                    print(f"❌ Error devuelto por el PAC para el UUID {uuid_obj}: {e}")

        else:
            print(
                f"⚠️ El UUID {uuid_obj} NO existe en la BD. Intentando cancelar directamente..."
            )
            try:
                # 🔒 ALERTA: Si la factura no está en la BD, no tienes 'invoice_id'.
                # Si tu BillingService tiene un método para cancelar directo por UUID, úsalo aquí.
                # De lo contrario, tendrías que llamar directamente a tu cliente SOAP/PAC pasándole el RFC Emisor a mano.

                if hasattr(service, "cancelar_por_uuid"):
                    service.cancelar_por_uuid(uuid=uuid_obj, motivo="02")
                    print(
                        f"✅ ¡ÉXITO! UUID {uuid_obj} cancelado directamente ante el PAC/SAT (Sin tocar BD)."
                    )
                else:
                    print(
                        f"🛑 ATENCIÓN: Tu 'BillingService' requiere un 'invoice_id' para leer el RFC y CSD del emisor."
                    )
                    print(
                        f"   Debes implementar una llamada directa a tu cliente SOAP para cancelar este UUID huérfano."
                    )

            except Exception as e:
                print(f"❌ Error al intentar cancelar el UUID huérfano {uuid_obj}: {e}")

    print("\n" + "=" * 80)
    print("✨ PROCESO TERMINADO. ✨")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    cancelar_uuids_especificos()
