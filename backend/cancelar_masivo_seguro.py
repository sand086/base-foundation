import os
import sys
import time
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService

# =====================================================================
# 🚨 CONFIGURACIÓN DE SEGURIDAD CRÍTICA
# =====================================================================
# False = MODO REAL. Envía las solicitudes de cancelación reales al SAT.
# True  = Modo Simulación. Solo busca en la BD y te muestra qué haría en pantalla.
MODO_SIMULACION = False
# =====================================================================


def ejecutor_masivo_sat():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    if MODO_SIMULACION:
        print(
            "🔍 [MASTER MASIVO - SIMULACIÓN] Analizando Base de Datos de forma segura..."
        )
    else:
        print("🚀 [MASTER MASIVO - MODO REAL] INICIANDO ENVIÓ DE CANCELACIONES AL SAT")
    print("=" * 80)

    # 🔴 AQUÍ ESTÁ LA CLAVE: Agregamos "CANCELADO" a la lista para obligar al
    # sistema a re-enviar al SAT todas las que se quedaron como "falsos cancelados".
    ESTADOS_ATORADOS = [
        "TIMBRADA",
        "ERROR_SAT",
        "PROCESANDO",
        "PENDIENTE_CANCELAR_SAT",
        "PROCESO_CANCELACION",
        "CANCELADO",
    ]

    # -----------------------------------------------------------------
    # BLOQUE 1: BUSCAR CARTAS PORTE DE $1 PESO (is_nominal = True)
    # -----------------------------------------------------------------
    cartas_porte = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.is_nominal == True,
            ReceivableInvoice.status_sat.in_(ESTADOS_ATORADOS),
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
            ReceivableInvoice.status_sat.in_(ESTADOS_ATORADOS),
            ReceivableInvoice.estatus == "cancelado",
        )
        .all()
    )

    total_cp = len(cartas_porte)
    total_f = len(facturas_f)
    print(
        f"📈 Facturas elegibles detectadas en el sistema (Incluyendo Falsos Cancelados):"
    )
    print(f"   - [CP] Cartas Porte Nominal ($1.12) a procesar: {total_cp}")
    print(f"   - [F]  Facturas Libres marcadas como canceladas: {total_f}")
    print("-" * 80)

    exitos = 0
    errores = 0

    # 🛠️ PROCESAR BLOQUE 1: CARTAS PORTE DE $1 PESO
    if total_cp > 0:
        print("\n⏳ Procesando bloque de Cartas Porte Nominales...")
        for cp in cartas_porte:
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
                continue

            if MODO_SIMULACION:
                print(
                    f"   [SIMULACIÓN] 🟢 Se cancelaría CP Nominal: {cp.folio_interno} -> Vinculada a Real: {real.folio_interno}"
                )
                exitos += 1
            else:
                try:
                    print(
                        f"   [CP] Forzando envío al SAT: {cp.folio_interno} (UUID: {cp.uuid})..."
                    )

                    service.cancelar_factura_sat(
                        invoice_id=cp.id, motivo="01", uuid_sustituto=real.uuid
                    )

                    # Se asegura de dejarlas como canceladas tal como pediste
                    db.refresh(cp)
                    cp.status_sat = "CANCELADO"
                    cp.estatus = "cancelado"
                    cp.saldo_pendiente = 0.0
                    db.add(cp)
                    db.commit()

                    print("        ✅ Procesada y cancelada en el SAT con éxito.")
                    exitos += 1
                    time.sleep(1.5)
                except Exception as e:
                    error_msg = str(e).lower()
                    if (
                        "previamente cancelado" in error_msg
                        or "ya se encuentra cancelado" in error_msg
                    ):
                        print(
                            "        ✅ El SAT confirma que ya estaba cancelada allá también."
                        )
                        exitos += 1
                    else:
                        print(f"        ❌ Error/Rechazo del SAT: {str(e)}")
                        errores += 1

    # 🛠️ PROCESAR BLOQUE 2: FACTURAS LIBRES SERIE F
    if total_f > 0:
        print("\n⏳ Procesando bloque de Facturas Libres Serie F...")
        for f in facturas_f:
            if MODO_SIMULACION:
                print(
                    f"   [SIMULACIÓN] 🟢 Se forzará cancelación al SAT de: {f.folio_interno} | UUID: {f.uuid}"
                )
                exitos += 1
            else:
                try:
                    print(
                        f"   [F] Forzando envío al SAT: {f.folio_interno} (UUID: {f.uuid})..."
                    )

                    service.cancelar_factura_sat(
                        invoice_id=f.id, motivo="02", uuid_sustituto=None
                    )

                    # Se asegura de dejarlas como canceladas
                    db.refresh(f)
                    f.status_sat = "CANCELADO"
                    f.estatus = "cancelado"
                    f.saldo_pendiente = 0.0
                    db.add(f)
                    db.commit()

                    print("        ✅ Procesada y cancelada en el SAT con éxito.")
                    exitos += 1
                    time.sleep(1.5)
                except Exception as e:
                    error_msg = str(e).lower()
                    if (
                        "previamente cancelado" in error_msg
                        or "ya se encuentra cancelado" in error_msg
                    ):
                        print(
                            "        ✅ El SAT confirma que ya estaba cancelada allá también."
                        )
                        exitos += 1
                    else:
                        print(f"        ❌ Error/Rechazo del SAT: {str(e)}")
                        errores += 1

    print("\n" + "=" * 80)
    print("🏁 RESUMEN FINAL DEL PROCESAMIENTO MASIVO:")
    print(f"   - Operaciones procesadas/exitosas en el SAT: {exitos}")
    print(f"   - Operaciones con incidencias (Rechazos/Timeouts): {errores}")
    print("=======================================================================\n")


if __name__ == "__main__":
    ejecutor_masivo_sat()
