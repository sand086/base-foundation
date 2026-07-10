import sys
import time
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
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

    # 1. Verificamos si la factura realmente no existe
    factura = (
        db.query(ReceivableInvoice)
        .filter(ReceivableInvoice.uuid == UUID_FANTASMA)
        .first()
    )

    # 2. Si no existe, inyectamos un registro mínimo para que el BillingService pueda operar
    if not factura:
        print(
            "⚠️ Factura no encontrada en la BD local. Inyectando registro fantasma..."
        )

        try:
            # Creamos el registro con los datos mínimos requeridos por tu modelo
            factura = ReceivableInvoice(
                uuid=UUID_FANTASMA,
                folio_interno="RESCATE-001",  # Folio temporal para identificarla
                estatus="timbrado",  # Estatus local para que el sistema permita cancelarla
                status_sat="VIGENTE",  # Estatus del SAT según la imagen
                total=TOTAL_FANTASMA,  # Requerido a veces por el PAC para validar la cancelación
            )
            db.add(factura)
            db.commit()
            db.refresh(factura)
            print(
                f"✅ Registro fantasma inyectado exitosamente con ID interno: {factura.id}"
            )
        except Exception as e:
            print(f"❌ Error al intentar crear el registro en BD: {e}")
            print(
                "💡 Revisa si tu modelo ReceivableInvoice requiere algún otro campo obligatorio (ej. client_id, emisor_id)."
            )
            return
    else:
        print(f"💡 La factura sí existe en la BD con el ID: {factura.id}")

    # 3. Ejecutamos la cancelación nativa usando tu servicio
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
