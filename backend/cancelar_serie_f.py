import os
import sys
from pathlib import Path
from sqlalchemy import or_

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService

# =====================================================================
# 🚨 CONFIGURACIÓN DE SEGURIDAD CRÍTICA
# =====================================================================
# True  = Modo Simulación. Solo busca en la BD y te muestra qué folios encontró.
# False = MODO REAL. Envía las solicitudes de cancelación reales al SAT.
MODO_SIMULACION = True

# Motivo SAT para Facturas Libres (02 = Errores sin relación)
MOTIVO_SAT = "02"
# =====================================================================


def ejecutar_limpieza_automatica_serie_f():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 75)
    if MODO_SIMULACION:
        print("🔍 [SERIE F AUTOMÁTICA - SIMULACIÓN] Buscando folios pendientes...")
    else:
        print("🚀 [SERIE F AUTOMÁTICA - MODO REAL] ENVIANDO CANCELACIONES AL SAT...")
    print("=" * 75)

    # BUSQUEDA DINÁMICA:
    # 1. Que empiece con 'F-' (Nomenclatura de Factura Libre)
    # 2. Que tenga un UUID timbrado
    # 3. Que su estado SAT actual no sea CANCELADO (siga vigente, con error o procesando)
    # 4. REGLA DE ORO: Que en tu ERP ya esté marcada como 'cancelado' ó esté en cola de espera
    facturas_atoradas = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.folio_interno.like("F-%"),
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.status_sat.in_(
                ["TIMBRADA", "ERROR_SAT", "PROCESANDO", "PENDIENTE_CANCELAR_SAT"]
            ),
            or_(
                ReceivableInvoice.estatus == "cancelado",
                ReceivableInvoice.status_sat == "PENDIENTE_CANCELAR_SAT",
            ),
        )
        .all()
    )

    print(
        f"🎯 Se detectaron {len(facturas_atoradas)} facturas Serie F que deben ser canceladas ante el SAT.\n"
    )

    if len(facturas_atoradas) == 0:
        print(
            "💡 No se encontraron facturas tipo F atoradas en este momento. Todo limpio."
        )
        return

    procesadas = 0
    errores = 0

    for fac in facturas_atoradas:
        if MODO_SIMULACION:
            print(
                f"[SIMULACIÓN] 🟢 SE CANCELARÍA: {fac.folio_interno} | UUID: {fac.uuid}"
            )
            print(
                f"             ↳ Razón: En el ERP figura como '{fac.estatus}' pero en el SAT sigue como '{fac.status_sat}'\n"
            )
            procesadas += 1
        else:
            try:
                print(
                    f"[EJECUTANDO] ⏳ Enviando cancelación al SAT para Factura {fac.folio_interno} (UUID: {fac.uuid})..."
                )

                # LLAMADA AL MOTOR REAL PARA SERIE F (Motivo 02)
                # Si el SAT responde con timeout (500), el parche de seguridad detendrá el registro local
                service.cancelar_factura_sat(
                    invoice_id=fac.id, motivo=MOTIVO_SAT, uuid_sustituto=None
                )
                print(f"             ✅ Solicitud enviada/procesada con éxito.")
                procesadas += 1
            except Exception as e:
                print(f"             ❌ Error o Timeout del SAT/PAC: {str(e)}")
                errores += 1

    print("\n" + "=" * 75)
    if MODO_SIMULACION:
        print(
            f"🏁 SIMULACIÓN TERMINADA. Se identificaron {procesadas} facturas tipo F listas para procesar."
        )
        print(
            "👉 Si la lista es correcta, cambia 'MODO_SIMULACION = False' para ejecutar en vivo."
        )
    else:
        print(f"🏁 PROCESO REAL COMPLETADO.")
        print(f"   - Sincronizadas con éxito en el SAT: {procesadas}")
        print(
            f"   - Atoradas por Timeout del SAT (Requieren volver a correr el script): {errores}"
        )
    print("=" * 75 + "\n")


if __name__ == "__main__":
    ejecutar_limpieza_automatica_serie_f()
