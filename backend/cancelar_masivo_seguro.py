import os
import sys
from pathlib import Path

# Configurar el path para que reconozca los módulos de la app
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService

# =====================================================================
# 🚨 CONFIGURACIÓN DE SEGURIDAD CRÍTICA
# =====================================================================
# True  = Modo Simulación. Solo busca y te muestra en pantalla qué haría.
# False = MODO REAL. Envía las cancelaciones masivas al SAT.
MODO_SIMULACION = False
# =====================================================================


def limpiar_cartas_porte_con_factura_real():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 70)
    if MODO_SIMULACION:
        print("🔍 [MODO SIMULACIÓN] Analizando de forma segura sin afectar al SAT...")
    else:
        print("🚀 [MODO REAL] PREPARANDO ENVÍO DE CANCELACIONES MASIVAS AL SAT...")
    print("=" * 70)

    # 1. Traer solo las cartas porte de $1 peso que siguen activas/vigentes en el sistema
    nominales_activas = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.is_nominal == True,
            ReceivableInvoice.status_sat.in_(
                ["TIMBRADA", "ERROR_SAT", "PROCESANDO", "PENDIENTE_CANCELAR_SAT"]
            ),
            ReceivableInvoice.viaje_id.isnot(None),
        )
        .all()
    )

    print(
        f"-> Se encontraron {len(nominales_activas)} Cartas Porte operativas de $1 peso vigentes en total."
    )
    print("-> Validando cuáles tienen ya su factura final real timbrada...\n")

    cartas_para_cancelar = []

    # 2. El filtro estricto que me pediste
    for fac_nom in nominales_activas:
        # Buscamos si para este mismo viaje existe la factura final ya ejecutada con éxito
        factura_real_timbrada = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.viaje_id == fac_nom.viaje_id,
                ReceivableInvoice.is_nominal == False,
                ReceivableInvoice.status_sat == "TIMBRADA",
            )
            .first()
        )

        if factura_real_timbrada:
            # Es 100% seguro guardarla para cancelar porque su contraparte real ya existe en el SAT
            cartas_para_cancelar.append(
                {"nominal": fac_nom, "real": factura_real_timbrada}
            )

    print(
        f"🎯 FILTRADO COMPLETADO: De las {len(nominales_activas)} encontradas, solo {len(cartas_para_cancelar)} CUMPLEN la regla de tener una factura real timbrada.\n"
    )

    if len(cartas_para_cancelar) == 0:
        print("💡 No hay facturas pendientes que cumplan con la regla. Todo en orden.")
        return

    # 3. Procesamiento o Simulación
    procesadas = 0
    errores = 0

    for item in cartas_para_cancelar:
        nom = item["nominal"]
        real = item["real"]

        if MODO_SIMULACION:
            print(
                f"[SIMULACIÓN] 🟢 SE CANCELARÍA: Folio Temporal: {nom.folio_interno} (ID: {nom.id}) | UUID: {nom.uuid}"
            )
            print(
                f"             ↳ Razón: El Viaje {nom.viaje_id} ya cuenta con la Factura Real Folio: {real.folio_interno} | UUID SAT: {real.uuid}\n"
            )
            procesadas += 1
        else:
            try:
                print(
                    f"[EJECUTANDO] ⏳ Enviando cancelación al SAT para Folio: {nom.folio_interno} (UUID: {nom.uuid})..."
                )

                # LLAMADA AL MOTOR REAL ORIGINAL DEL SISTEMA
                # cancela con motivo '01' (Comprobante emitido con errores con relación) vinculándolo al UUID real
                service.cancelar_factura_sat(
                    invoice_id=nom.id, motivo="01", uuid_sustituto=real.uuid
                )
                print(f"             ✅ Enviada con éxito.")
                procesadas += 1
            except Exception as e:
                print(f"             ❌ Error en comunicación SAT/PAC: {str(e)}")
                errores += 1

    print("=" * 70)
    if MODO_SIMULACION:
        print(
            f"🏁 SIMULACIÓN TERMINADA. Se identificaron {procesadas} facturas listas para ser canceladas de forma segura."
        )
        print(
            "👉 Si la lista es correcta, edita este archivo, cambia 'MODO_SIMULACION = True' a 'MODO_SIMULACION = False' y vuelve a correrlo."
        )
    else:
        print(f"🏁 PROCESO REAL COMPLETADO.")
        print(f"   - Solicitudes exitosas enviadas al PAC/SAT: {procesadas}")
        print(f"   - Solicitudes fallidas: {errores}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    limpiar_cartas_porte_con_factura_real()
