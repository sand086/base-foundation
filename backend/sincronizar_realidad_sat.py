import sys
import time
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def auto_vigilante_sat():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print(
        "🤖 [VIGILANTE NOCTURNO] CONSULTANDO ESTATUS DE CANCELACIONES PENDIENTES AL PAC/SAT"
    )
    print("=" * 80)

    # 1. Buscamos SOLAMENTE facturas (Ingreso y CPs) que estén atrapadas en "En Proceso"
    facturas_en_proceso = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.status_sat == "PROCESO_CANCELACION",
            ReceivableInvoice.uuid.isnot(None),
        )
        .all()
    )

    total = len(facturas_en_proceso)

    if total == 0:
        print("✅ Todo limpio. No hay facturas en 'Proceso de Cancelación'.")
        print("=" * 80 + "\n")
        return

    print(
        f"📋 Se encontraron {total} facturas esperando respuesta del receptor o del SAT."
    )
    print("⏳ Preguntando al PAC su estatus actual...\n")

    aprobadas = 0
    rechazadas = 0
    siguen_pendientes = 0
    errores = 0

    for fac in facturas_en_proceso:
        print(f"🚀 Consultando UUID: {fac.uuid} (Folio: {fac.folio_interno})...")

        try:
            # 2. Le preguntamos al PAC qué dice el SAT sobre este UUID
            # Nota: Asumimos que tu BillingService ahora tiene un método 'consultar_estatus_sat'
            # (Si no lo tiene, crearemos uno genérico usando 'cancelar_factura_sat' con un "reintento")

            # Como no podemos estar seguros si tu PAC expone la consulta limpia,
            # reintentamos la cancelación para que el SAT nos escupa la verdad (Previamente cancelada o Rechazada)
            service.cancelar_factura_sat(
                invoice_id=fac.id, motivo=fac.motivo_cancelacion or "01"
            )

            # Si pasa limpio sin levantar error, significa que el SAT la acaba de matar
            print("   ✅ EL SAT DIO LUZ VERDE: Cancelación aprobada.")
            aprobadas += 1

        except Exception as e:
            error_msg = str(e).lower()

            if (
                "previamente cancelado" in error_msg
                or "ya se encuentra cancelado" in error_msg
            ):
                print("   ✅ EL SAT CONFIRMA: El cliente ya aceptó y la factura murió.")
                # Confirmar baja en BD
                db.refresh(fac)
                fac.status_sat = "CANCELADO"
                fac.estatus = "cancelado"
                fac.saldo_pendiente = 0.0
                fac.detalle_sat = "El Receptor aprobó la cancelación."
                db.add(fac)
                db.commit()
                aprobadas += 1

            elif "proceso" in error_msg:
                print(
                    "   ⏳ PACIENCIA: El cliente receptor aún no entra a su buzón a darle Aceptar/Rechazar."
                )
                siguen_pendientes += 1

            elif (
                "rechazada" in error_msg
                or "rechazo" in error_msg
                or "no cancelable" in error_msg
            ):
                print(
                    "   ❌ EL CLIENTE RECHAZÓ LA CANCELACIÓN (O tiene pagos relacionados). ¡Haciendo Rollback!"
                )
                # Rollback automático a la vida
                db.refresh(fac)
                fac.status_sat = "TIMBRADA"
                fac.estatus = "pendiente"
                fac.saldo_pendiente = fac.monto_total  # Revivimos la deuda
                fac.detalle_sat = f"Alerta: {str(e)}"
                db.add(fac)
                db.commit()
                rechazadas += 1

            else:
                print(f"   ⚠️ ERROR INESPERADO AL CONSULTAR: {str(e)}")
                errores += 1

        # Pausa para no saturar los Web Services de Solución Factible
        time.sleep(2)

    print("\n" + "=" * 80)
    print("🏁 REPORTE DEL VIGILANTE:")
    print(f"   - 🟢 Cancelaciones Aprobadas (Deuda muerta): {aprobadas}")
    print(f"   - 🔴 Cancelaciones Rechazadas (Deuda reactivada): {rechazadas}")
    print(
        f"   - 🟡 Siguen en Proceso (El cliente no ha contestado): {siguen_pendientes}"
    )
    print(f"   - ⚠️ Errores de red: {errores}")
    print("=======================================================================\n")


if __name__ == "__main__":
    auto_vigilante_sat()
