import os
import sys
from pathlib import Path

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

# 📋 LISTA DE FOLIOS "F" QUE EL CLIENTE DICE QUE DEBEN ESTAR CANCELADOS
# Agrégalos tal como aparecen en el sistema con el prefijo "F-"
FOLIOS_A_PROCESAR = ["F-17390", "F-17391", "F-17393", "F-17394", "F-17397", "F-17398"]

# Motivo SAT para Facturas Libres (02 = Errores sin relación)
MOTIVO_SAT = "02"
# =====================================================================


def ejecutar_limpieza_serie_f():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 75)
    if MODO_SIMULACION:
        print("🔍 [SERIE F - SIMULACIÓN] Analizando folios de forma segura...")
    else:
        print("🚀 [SERIE F - MODO REAL] ENVIANDO CANCELACIONES MASIVAS AL SAT...")
    print("=" * 75)

    if not FOLIOS_A_PROCESAR:
        print("❌ La lista FOLIOS_A_PROCESAR está vacía. Por favor añade los folios.")
        return

    # Buscar las facturas en la base de datos
    facturas = (
        db.query(ReceivableInvoice)
        .filter(ReceivableInvoice.folio_interno.in_(FOLIOS_A_PROCESAR))
        .all()
    )

    print(
        f"-> Se encontraron {len(facturas)} de los {len(FOLIOS_A_PROCESAR)} folios solicitados en la Base de Datos.\n"
    )

    procesadas = 0
    errores = 0

    for fac in facturas:
        # Candado de seguridad: verificar que tenga prefijo F y tenga UUID timbrado
        if not fac.folio_interno.startswith("F-"):
            print(
                f"⚠️ Saltando {fac.folio_interno}: No corresponde a la nomenclatura F."
            )
            continue

        if not fac.uuid:
            print(
                f"⚠️ Saltando {fac.folio_interno}: Este registro no tiene UUID timbrado en la BD."
            )
            continue

        if MODO_SIMULACION:
            print(
                f"[SIMULACIÓN] 🟢 SE CANCELARÍA: {fac.folio_interno} | UUID SAT: {fac.uuid} | Estado Actual: {fac.status_sat}"
            )
            procesadas += 1
        else:
            try:
                print(
                    f"[EJECUTANDO] ⏳ Enviando cancelación al SAT para Factura {fac.folio_interno} (UUID: {fac.uuid})..."
                )

                # LLAMADA AL MOTOR REAL PARA SERIE F (Motivo 02)
                # El parche de seguridad detendrá el proceso si el SAT responde con timeout 500
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
            f"🏁 SIMULACIÓN TERMINADA. Se validaron {procesadas} facturas tipo F correctamente."
        )
        print(
            "👉 Si la lista es correcta, edita el script, cambia 'MODO_SIMULACION = False' y ejecuta de verdad."
        )
    else:
        print(f"🏁 PROCESO REAL COMPLETADO.")
        print(f"   - Enviadas con éxito al SAT: {procesadas}")
        print(
            f"   - Rebozadas por Timeout (Requieren volver a correr el script): {errores}"
        )
    print("=" * 75 + "\n")


if __name__ == "__main__":
    ejecutar_limpieza_serie_f()
