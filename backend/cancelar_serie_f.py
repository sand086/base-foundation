import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db


def diagnostico_exacto():
    db = next(get_db())
    uuid_com = "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF"
    folios_relacionados = ["17665", "17559", "9762", "17444", "17441", "17424", "17388"]

    print("\n" + "=" * 80)
    print("🔬 DIAGNÓSTICO EXACTO BASADO EN TUS MODELOS ORM")
    print("=" * 80)

    # 1. Buscar en la tabla correcta de Complementos de Pago
    print(f"\n1️⃣ BUSCANDO COMPLEMENTO FANTASMA EN 'receivable_invoice_payments'")
    query_pago = text("""
        SELECT id, monto, parcialidad, estatus, complemento_uuid, folio_complemento 
        FROM receivable_invoice_payments 
        WHERE LOWER(complemento_uuid) = LOWER(:u) OR folio_complemento = '2638'
    """)
    pago = db.execute(query_pago, {"u": uuid_com}).fetchone()

    if pago:
        p_data = dict(pago._mapping) if hasattr(pago, "_mapping") else dict(pago)
        print(f"   ⚠️ ¡ATENCIÓN! El pago SÍ existe en la BD: {p_data}")
        print(
            "   👉 Como el registro existe, por eso tu interfaz lo cuenta para la Parcialidad 2."
        )
    else:
        print("   ❌ El Complemento no existe en 'receivable_invoice_payments'.")

    # 2. Revisar el estado de las facturas originales
    print("\n2️⃣ REVISANDO SALDOS REALES EN 'receivable_invoices'")
    for folio in folios_relacionados:
        try:
            query_inv = text("""
                SELECT id, folio_interno, monto_total, saldo_pendiente, estatus 
                FROM receivable_invoices 
                WHERE folio_interno LIKE :f
            """)
            factura = db.execute(query_inv, {"f": f"%{folio}%"}).fetchone()

            if factura:
                f_data = (
                    dict(factura._mapping)
                    if hasattr(factura, "_mapping")
                    else dict(factura)
                )
                print(
                    f"   ✅ Factura {folio}: ID={f_data['id']} | Monto Total=${f_data['monto_total']} | Saldo Pendiente=${f_data['saldo_pendiente']} | Estatus={f_data['estatus']}"
                )

                # Ver si tienen pagos anclados
                query_pagos = text(
                    "SELECT id, monto, parcialidad, estatus FROM receivable_invoice_payments WHERE invoice_id = :inv_id"
                )
                pagos = db.execute(query_pagos, {"inv_id": f_data["id"]}).fetchall()
                if pagos:
                    print(f"      ⚠️ ¡TIENE {len(pagos)} PAGOS REGISTRADOS!")
                    for p in pagos:
                        p_d = dict(p._mapping) if hasattr(p, "_mapping") else dict(p)
                        print(
                            f"         - Pago ID: {p_d['id']} | Monto: ${p_d['monto']} | Parcialidad: {p_d['parcialidad']} | Estatus: {p_d['estatus']}"
                        )
            else:
                print(f"   ❌ No se encontró factura para el folio {folio}.")
        except Exception as e:
            print(f"   ❌ Error al consultar folio {folio}: {e}")

    db.close()
    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    diagnostico_exacto()
