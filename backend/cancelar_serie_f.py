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
# True  = Modo Simulación. Solo busca y te muestra la lista de la cantidad X.
# False = MODO REAL. Envía las solicitudes de cancelación masivas reales al SAT.
MODO_SIMULACION = True

# Motivo SAT para Facturas Libres (02 = Errores sin relación)
MOTIVO_SAT = "02"
# =====================================================================


def barrido_masivo_automatico_serie_f():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    if MODO_SIMULACION:
        print(
            "🔍 [SERIE F MASIVA - SIMULACIÓN] Escaneando Base de Datos de forma segura..."
        )
    else:
        print(
            "🚀 [SERIE F MASIVA - MODO REAL] ENVIANDO ORDEN DE CANCELACIÓN MASIVA AL SAT..."
        )
    print("=" * 80)

    # REGLA DE ORO EXTRA-SEGURA:
    # 1. Que el folio empiece con 'F-' (Facturas libres)
    # 2. Que tenga un UUID real timbrado en el SAT
    # 3. Que en tu ERP el estatus de la deuda ya sea 'cancelado' (así protegemos tus facturas vivas)
    facturas_serie_f = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.folio_interno.like("F-%"),
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.estatus == "cancelado",
        )
        .all()
    )

    total_encontradas = len(facturas_serie_f)
    print(
        f"🎯 Se detectaron {total_encontradas} facturas Serie F marcadas como canceladas en tu ERP."
    )
    print(
        "--------------------------------------------------------------------------------"
    )

    if total_encontradas == 0:
        print(
            "💡 Todo limpio. No hay facturas de la serie F que requieran sincronización."
        )
        return

    procesadas = 0
    errores = 0
    ya_canceladas_sat = 0

    for fac in facturas_serie_f:
        if MODO_SIMULACION:
            print(
                f"[SIMULACIÓN] 🟢 SE ENVIARÁ AL SAT: Folio: {fac.folio_interno} | UUID: {fac.uuid}"
            )
            print(
                f"             ↳ Estado local en BD: status_sat='{fac.status_sat}' | estatus_erp='{fac.estatus}'\n"
            )
            procesadas += 1
        else:
            try:
                print(
                    f"[EJECUTANDO] ⏳ Procesando Factura Libre {fac.folio_interno} (UUID: {fac.uuid})..."
                )

                # Enviar comando de cancelación SOAP directo al PAC (Motivo 02)
                # El parche de seguridad del motor evitará malas escrituras si el SAT da timeout 500
                service.cancelar_factura_sat(
                    invoice_id=fac.id, motivo=MOTIVO_SAT, uuid_sustituto=None
                )
                print(
                    f"             ✅ Solicitud de cancelación enviada/confirmada con éxito."
                )
                procesadas += 1
                time.sleep(1.5)  # 💡 PAUSA ANTISATURACIÓN (Evita el error 500 del SAT)

            except Exception as e:
                error_msg = str(e).lower()
                # Si el SAT responde que YA estaba cancelada, actualizamos la BD local de una vez
                if (
                    "ya se encuentra cancelado" in error_msg
                    or "comprobante cancelado" in error_msg
                ):
                    print(
                        f"             ℹ️ El SAT informa que este folio ya estaba cancelado en sus servidores. Sincronizando BD..."
                    )
                    fac.status_sat = "CANCELADO"
                    db.add(fac)
                    db.commit()
                    ya_canceladas_sat += 1
                else:
                    print(f"             ❌ Error o Timeout del SAT/PAC: {str(e)}")
                    errores += 1

    print("\n" + "=" * 80)
    if MODO_SIMULACION:
        print(
            f"🏁 SIMULACIÓN TERMINADA. Se identificó una cantidad X de {procesadas} facturas listas."
        )
        print(
            "👉 Si la lista es correcta, cambia 'MODO_SIMULACION = False' para ejecutar en vivo."
        )
    else:
        print(f"🏁 PROCESO REAL COMPLETADO.")
        print(f"   - Canceladas con éxito en esta corrida: {procesadas}")
        print(
            f"   - Folios que el SAT confirmó que ya estaban cancelados antes: {ya_canceladas_sat}"
        )
        print(
            f"   - Atoradas por Timeout 500 (Requieren volver a correr el script): {errores}"
        )
    print("=" * 80 + "\n")


if __name__ == "__main__":
    barrido_masivo_automatico_serie_f()
