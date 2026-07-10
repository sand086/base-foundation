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
# True  = Modo Simulación. Solo busca y te muestra qué facturas cancelaría.
# False = MODO REAL. Envía las solicitudes de cancelación reales al SAT.
MODO_SIMULACION = False

# Motivo SAT de Cancelación (02 = Errores sin relación)
MOTIVO_SAT = "02"

# 📋 LISTA DE UUIDs A CANCELAR
# Agrega aquí todos los UUIDs exactos que necesites dar de baja
LISTA_UUIDS = [
    "FFDE385D-EBA7-490D-9458-4B7125E601E2",
    # "OTRO-UUID-AQUI",
]
# =====================================================================


def cancelar_facturas_especificas():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    if MODO_SIMULACION:
        print(
            "🔍 [CANCELACIÓN ESPECÍFICA - SIMULACIÓN] Validando UUIDs en la Base de Datos..."
        )
    else:
        print(
            "🚀 [CANCELACIÓN ESPECÍFICA - MODO REAL] ENVIANDO ORDEN DE CANCELACIÓN AL SAT..."
        )
    print("=" * 80)

    # REGLA DE BÚSQUEDA:
    # Traer exactamente las facturas cuyos UUIDs coincidan con la lista proporcionada
    facturas_especificas = (
        db.query(ReceivableInvoice)
        .filter(ReceivableInvoice.uuid.in_(LISTA_UUIDS))
        .all()
    )

    total_encontradas = len(facturas_especificas)
    print(
        f"🎯 Se detectaron {total_encontradas} de {len(LISTA_UUIDS)} facturas solicitadas en tu ERP."
    )
    print(
        "--------------------------------------------------------------------------------"
    )

    if total_encontradas == 0:
        print(
            "💡 Todo limpio. No se encontró ninguna factura en la BD con los UUIDs proporcionados."
        )
        return

    procesadas = 0
    errores = 0
    ya_canceladas_sat = 0

    for fac in facturas_especificas:
        if MODO_SIMULACION:
            print(
                f"[SIMULACIÓN] 🟢 SE ENVIARÁ AL SAT: Folio: {fac.folio_interno} | UUID: {fac.uuid}"
            )
            print(
                f"            ↳ Estado local en BD: status_sat='{fac.status_sat}' | estatus_erp='{fac.estatus}'\n"
            )
            procesadas += 1
        else:
            try:
                print(
                    f"[EJECUTANDO] ⏳ Procesando Factura {fac.folio_interno} (UUID: {fac.uuid})..."
                )

                # Enviar comando de cancelación SOAP directo al PAC
                service.cancelar_factura_sat(
                    invoice_id=fac.id, motivo=MOTIVO_SAT, uuid_sustituto=None
                )
                print(
                    f"            ✅ Solicitud de cancelación enviada/confirmada con éxito."
                )
                procesadas += 1
                time.sleep(1.5)  # 💡 PAUSA ANTISATURACIÓN (Evita el error 500 del SAT)

            except Exception as e:
                error_msg = str(e).lower()
                # Si el SAT responde que YA estaba cancelada, actualizamos la BD local
                if (
                    "ya se encuentra cancelado" in error_msg
                    or "comprobante cancelado" in error_msg
                ):
                    print(
                        f"            ℹ️ El SAT informa que este folio ya estaba cancelado en sus servidores. Sincronizando BD..."
                    )
                    fac.status_sat = "CANCELADO"
                    db.add(fac)
                    db.commit()
                    ya_canceladas_sat += 1
                else:
                    print(f"            ❌ Error o Timeout del SAT/PAC: {str(e)}")
                    errores += 1

    print("\n" + "=" * 80)
    if MODO_SIMULACION:
        print(
            f"🏁 SIMULACIÓN TERMINADA. Se simularon {procesadas} facturas listas para cancelar."
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
    cancelar_facturas_especificas()