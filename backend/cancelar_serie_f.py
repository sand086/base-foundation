import sys
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def cancelar_solo_un_peso():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🚀 INICIANDO CANCELACIÓN SEGURA: SOLO FACTURAS DE $1.12")
    print("=" * 80)

    # 🔒 FILTRO 1: Buscar en BD solo facturas con monto exacto de 1.12 que sigan vigentes
    facturas_1_peso = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.monto_total == 1.12,
            ReceivableInvoice.status_sat != "CANCELADO",
        )
        .all()
    )

    if not facturas_1_peso:
        print("✅ No se encontraron facturas de $1.12 pendientes por cancelar.")
        return

    print(f"🔍 Se encontraron {len(facturas_1_peso)} facturas de $1.12 exactos.")

    for factura in facturas_1_peso:
        # 🔒 FILTRO 2 (CANDADO DE SEGURIDAD): Doble validación antes de tocar el PAC/SAT
        if factura.monto_total != 1.12:
            print(
                f"⚠️ SALTANDO FOLIO {factura.folio_interno} porque su monto NO es 1.12 (Es ${factura.monto_total})"
            )
            continue

        print(
            f"\n⏳ Cancelando Folio: {factura.folio_interno} | Monto: ${factura.monto_total} | UUID: {factura.uuid}"
        )
        try:
            # Disparamos la cancelación con Motivo 02 (Errores sin relación)
            service.cancelar_factura_sat(
                invoice_id=factura.id, motivo="02", uuid_sustituto=None
            )
            print(f"✅ ¡ÉXITO! Folio {factura.folio_interno} cancelado ante el SAT.")

        except Exception as e:
            error_msg = str(e).lower()
            if (
                "ya se encuentra cancelado" in error_msg
                or "comprobante cancelado" in error_msg
            ):
                print(
                    f"ℹ️ El SAT informa que el Folio {factura.folio_interno} YA ESTABA CANCELADO. Sincronizando BD..."
                )
                factura.status_sat = "CANCELADO"
                factura.estatus = "cancelado"
                db.commit()
            else:
                print(
                    f"❌ Error devuelto por el PAC para el Folio {factura.folio_interno}: {e}"
                )

    print("\n" + "=" * 80)
    print("✨ PROCESO TERMINADO. NINGUNA OTRA FACTURA FUE TOCADA. ✨")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    cancelar_solo_un_peso()
