import sys
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoicePayment, InvoiceStatus


def restaurar_saldos_facturas():
    db = next(get_db())

    # 📌 EL UUID DEL COMPLEMENTO DE PAGO
    uuid_rep = "F9E5A3E8-3DB8-4A32-9E52-B75A85EC45E4"

    print("\n" + "=" * 80)
    print("🚀 INICIANDO RESTAURACIÓN DE SALDOS Y ESTATUS DE FACTURAS")
    print("=" * 80)

    try:
        # Buscar TODOS los pagos internos asociados a este REP (uno por cada factura pagada)
        pagos = (
            db.query(ReceivableInvoicePayment)
            .filter(ReceivableInvoicePayment.complemento_uuid == uuid_rep)
            .all()
        )

        if not pagos:
            print(f"⚠️ No se encontraron registros de pago para el REP {uuid_rep}.")
        else:
            print(
                f"✅ Se encontraron {len(pagos)} facturas ligadas a este REP. Restaurando saldos...\n"
            )

            for pago in pagos:
                factura = pago.invoice
                if factura:
                    monto_pagado = pago.monto

                    # 1. Devolver el dinero al saldo pendiente de la factura
                    factura.saldo_pendiente += monto_pagado

                    # 2. Cambiar el estatus de la factura a PENDIENTE
                    factura.estatus = InvoiceStatus.PENDIENTE

                    # 3. Asegurar que el registro del pago quede cancelado
                    pago.estatus = "CANCELADO"

                    print(
                        f"   -> Factura {factura.folio_interno} | Saldo devuelto: ${monto_pagado} | Estatus: PENDIENTE"
                    )

            # Guardar los cambios
            db.commit()
            print(
                "\n💾 BD Sincronizada: Las facturas ahora están libres y pendientes de pago."
            )

    except Exception as e:
        db.rollback()
        print(f"❌ Error crítico: {e}")
    finally:
        db.close()
        print("\n" + "=" * 80)
        print("✨ PROCESO TERMINADO. ✨")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    restaurar_saldos_facturas()
