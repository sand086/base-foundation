import os
import sys
import time
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def ejecutor_masivo_sat():
    db = next(get_db())
    service = BillingService(db)

    print(
        "\n" + "======================================================================="
    )
    print("🚀 INICIANDO PROCESAMIENTO MASIVO REAL DE CANCELACIONES ANTE EL SAT")
    print("=======================================================================")

    # -----------------------------------------------------------------
    # BLOQUE 1: BUSCAR CARTAS PORTE DE $1 PESO (is_nominal = True)
    # -----------------------------------------------------------------
    cartas_porte = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.is_nominal == True,
            ReceivableInvoice.status_sat.in_(
                ["TIMBRADA", "ERROR_SAT", "PROCESANDO", "PENDIENTE_CANCELAR_SAT"]
            ),
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.viaje_id.isnot(None),
        )
        .all()
    )

    # -----------------------------------------------------------------
    # BLOQUE 2: BUSCAR FACTURAS LIBRES SERIE F CANCELADAS EN EL ERP
    # -----------------------------------------------------------------
    facturas_f = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.folio_interno.like("F-%"),
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.status_sat.in_(
                ["TIMBRADA", "ERROR_SAT", "PROCESANDO", "PENDIENTE_CANCELAR_SAT"]
            ),
            ReceivableInvoice.estatus == "cancelado",
        )
        .all()
    )

    total_cp = len(cartas_porte)
    total_f = len(facturas_f)
    print(
        f"📈 Detectadas en Base de Datos:\n   - {total_cp} Cartas Porte ($1.00) pendientes.\n   - {total_f} Facturas libres Serie F pendientes."
    )
    print("-----------------------------------------------------------------------")

    exitos = 0
    errores = 0

    # PROCESAR CARTAS PORTE DE $1 PESO (Motivo 01 con Relación)
    if total_cp > 0:
        print("\n⏳ Procesando bloque de Cartas Porte de $1 peso...")
        for cp in cartas_porte:
            # Buscar su contraparte real timbrada para amarrar la relación 01
            real = (
                db.query(ReceivableInvoice)
                .filter(
                    ReceivableInvoice.viaje_id == cp.viaje_id,
                    ReceivableInvoice.is_nominal == False,
                    ReceivableInvoice.status_sat == "TIMBRADA",
                )
                .first()
            )

            if not real:
                # Si no tiene factura real ejecutada, no la tocamos por seguridad
                continue

            try:
                print(
                    f"[CP] Enviando Folio: {cp.folio_interno} -> UUID Sustituto: {real.folio_interno}"
                )
                service.cancelar_factura_sat(
                    invoice_id=cp.id, motivo="01", uuid_sustituto=real.uuid
                )
                print("     ✅ Procesada/Enviada con éxito.")
                exitos += 1
                time.sleep(1.5)  # 💡 PAUSA ANTISATURACIÓN (Evita error 500)
            except Exception as e:
                print(f"     ❌ Error o Timeout: {str(e)}")
                errores += 1

    # PROCESAR FACTURAS SERIE F (Motivo 02 sin Relación)
    if total_f > 0:
        print("\n⏳ Procesando bloque de Facturas libres Serie F...")
        for f in facturas_f:
            try:
                print(f"[F] Enviando Factura Libre: {f.folio_interno} | UUID: {f.uuid}")
                service.cancelar_factura_sat(
                    invoice_id=f.id, motivo="02", uuid_sustituto=None
                )
                print("     ✅ Procesada/Enviada con éxito.")
                exitos += 1
                time.sleep(1.5)  # 💡 PAUSA ANTISATURACIÓN (Evita error 500)
            except Exception as e:
                print(f"     ❌ Error o Timeout: {str(e)}")
                errores += 1

    print(
        "\n" + "======================================================================="
    )
    print("🏁 RESUMEN FINAL DEL PROCESO MASIVO:")
    print(f"   - Solicitudes exitosas aceptadas por el PAC/SAT: {exitos}")
    print(f"   - Solicitudes rebotadas (Timeouts del SAT a reintentar): {errores}")
    print("=======================================================================\n")


if __name__ == "__main__":
    ejecutor_masivo_sat()
