import sys
import time
from datetime import date
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice, Client
from app.integrations.sat.billing_service import BillingService

# =====================================================================
# DATOS EXTRAÍDOS DE LA IMAGEN SAT
# =====================================================================
UUID_FANTASMA = "FFDE385D-EBA7-490D-9458-4B7125E601E2"
TOTAL_FANTASMA = 3074.00
MOTIVO_SAT = "02"  # Errores sin relación
# =====================================================================


def cancelar_factura_perdida():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print(f"🚀 INICIANDO RESCATE Y CANCELACIÓN DEL UUID: {UUID_FANTASMA}")
    print("=" * 80)

    factura = (
        db.query(ReceivableInvoice)
        .filter(ReceivableInvoice.uuid == UUID_FANTASMA)
        .first()
    )

    if not factura:
        print(
            "⚠️ Factura no encontrada en la BD local. Inyectando registro fantasma..."
        )

        # Necesitamos un cliente real para satisfacer la llave foránea client_id
        cliente_ref = db.query(Client).first()
        if not cliente_ref:
            print(
                "❌ Error: No se encontró ningún cliente en la BD para asociar a la factura."
            )
            return

        try:
            # Llenamos estrictamente los campos que son nullable=False en el modelo
            factura = ReceivableInvoice(
                client_id=cliente_ref.id,
                uuid=UUID_FANTASMA,
                folio_interno="RESCATE-001",
                estatus="pendiente",  # 👈 Enum válido según InvoiceStatus
                status_sat="VIGENTE",
                monto_total=TOTAL_FANTASMA,  # 👈 nullable=False
                saldo_pendiente=TOTAL_FANTASMA,  # 👈 nullable=False
                fecha_emision=date.today(),  # 👈 nullable=False
                fecha_vencimiento=date.today(),  # 👈 nullable=False
            )

            db.add(factura)
            db.commit()
            db.refresh(factura)
            print(
                f"✅ Registro fantasma inyectado exitosamente con ID interno: {factura.id}"
            )

        except Exception as e:
            db.rollback()
            print(f"❌ Error al intentar crear el registro en BD: {e}")
            return
    else:
        print(f"💡 La factura sí existe en la BD con el ID: {factura.id}")

    print(f"\n⏳ Enviando orden de cancelación al SAT/PAC (Motivo {MOTIVO_SAT})...")
    try:
        service.cancelar_factura_sat(
            invoice_id=factura.id, motivo=MOTIVO_SAT, uuid_sustituto=None
        )
        print("✅ ¡Orden de cancelación procesada por el PAC!")
        print("-" * 80)
        print("🚨 ATENCIÓN: Según el SAT, esta factura es 'Cancelable con aceptación'.")
        print(
            "🚨 El receptor (HANSA MEYER GLOBAL TRANSPORT) debe autorizarla en su buzón tributario."
        )
        print("-" * 80)

    except Exception as e:
        error_msg = str(e).lower()
        if (
            "ya se encuentra cancelado" in error_msg
            or "comprobante cancelado" in error_msg
        ):
            print("ℹ️ El SAT informa que esta factura YA ESTABA CANCELADA previamente.")
            factura.status_sat = "CANCELADO"
            factura.estatus = "cancelado"
            db.commit()
            print("✅ Base de datos actualizada al estatus correcto.")
        else:
            print(f"❌ Error al contactar al SAT/PAC: {e}")


if __name__ == "__main__":
    cancelar_factura_perdida()
