import sys
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice


def sincronizar_erp_con_sat():
    db = next(get_db())

    print("\n" + "=" * 80)
    print("🛠️ SINO_REALIDAD: AJUSTANDO ESTATUS LOCALES VS LA REALIDAD DEL SAT")
    print("=" * 80)

    # MAPEO EXACTO BASADO EN TU REPORTE FISCAL REAL
    # True = Sigue vigente en el SAT (Se reactiva deuda) | False = Ya está cancelada en el SAT
    mapeo_sat = {
        "820EBBAF-2191-4E79-B12E-7C96E524977C": {
            "vigente": True,
            "motivo": "SAT 623: No timbrada por este PAC. Sigue VIGENTE.",
        },
        "4CC84F95-BBAA-49E7-A76D-76158D8BE01F": {
            "vigente": True,
            "motivo": "SAT 204: No cancelable (Tiene documentos relacionados). Sigue VIGENTE.",
        },
        "84B501DA-4722-433A-B7B8-C5DFA260D24C": {
            "vigente": False,
            "motivo": "SAT 202: Confirmada como CANCELADA previamente.",
        },
        "B9BB1E49-87B9-42A9-A867-2AFB0BA38C2A": {
            "vigente": True,
            "motivo": "SAT 213: RECHAZADA por el cliente receptor. Sigue VIGENTE.",
        },
        "3D086B68-9C18-4D29-9CF5-1E290AA901EE": {
            "vigente": True,
            "motivo": "SAT 623: No timbrada por este PAC. Sigue VIGENTE.",
        },
        "5B02B7EE-4CAF-4F5C-A003-EC52B5F6B8CA": {
            "vigente": True,
            "motivo": "SAT 213: RECHAZADA por el cliente receptor. Sigue VIGENTE.",
        },
        "533DAAAB-F296-4504-98EA-A73E50CE0F8F": {
            "vigente": False,
            "motivo": "SAT 202: Confirmada como CANCELADA previamente.",
        },
    }

    print(f"⏳ Analizando y corrigiendo el lote de {len(mapeo_sat)} facturas...")
    print("-" * 80)

    for uuid, info in mapeo_sat.items():
        fac = db.query(ReceivableInvoice).filter(ReceivableInvoice.uuid == uuid).first()

        if not fac:
            print(
                f"⚠️ UUID {uuid} no encontrado en la Base de Datos local. Saltando..."
            )
            continue

        if info["vigente"]:
            # 🚨 SI SIGE VIGENTE EN EL SAT: Restauramos la factura en el ERP
            print(
                f"🔴 RE-ACTIVANDO DEUDA -> Folio: {fac.folio_interno} | Razón: {info['motivo']}"
            )
            fac.status_sat = "TIMBRADA"
            fac.estatus = "pendiente"
            fac.saldo_pendiente = (
                fac.monto_total
            )  # Le devolvemos el saldo para cobrarlo
            fac.concepto = f"{fac.concepto} (RECHAZADA CANCELACIÓN SAT - RE-ACTIVADA)"
        else:
            # ✅ SI YA ESTÁ CANCELADA EN EL SAT: Aseguramos el estado en el ERP
            print(
                f"🟢 CONFIRMANDO BAJA -> Folio: {fac.folio_interno} | Razón: {info['motivo']}"
            )
            fac.status_sat = "CANCELADO"
            fac.estatus = "cancelado"
            fac.saldo_pendiente = 0.0  # Saldo en ceros reales

        db.add(fac)

    try:
        db.commit()
        print("-" * 80)
        print("✅ ¡BASE DE DATOS SINCRONIZADA TRANSPARENTEMENTE CON EL SAT!")
        print(
            "   Las facturas vivas volvieron a cobranza y las canceladas se amarraron en ceros."
        )
    except Exception as e:
        db.rollback()
        print(f"❌ Error guardando la sincronización: {str(e)}")
    finally:
        db.close()
    print("=" * 80 + "\n")


if __name__ == "__main__":
    sincronizar_erp_con_sat()
