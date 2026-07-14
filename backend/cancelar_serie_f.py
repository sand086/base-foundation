import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno para heredar tu conexión
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db


def auditoria_fiscal():
    db = next(get_db())
    uuid_com = "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF"
    folios = ["17665", "17559", "9762", "17444", "17441", "17424", "17388"]

    print("\n" + "=" * 80)
    print("🕵️‍♂️ INICIANDO AUDITORÍA FISCAL (SOLO LECTURA)")
    print("=" * 80)

    # 1. Rastrear el UUID del Complemento de Pago
    print(f"\n1️⃣ BUSCANDO EL COMPLEMENTO DE PAGO UUID: {uuid_com}")
    tablas = db.execute(
        text(
            "SELECT table_name FROM information_schema.columns WHERE column_name = 'uuid' AND table_schema = 'public'"
        )
    ).fetchall()

    encontrado_pago = False
    for t in tablas:
        t_name = t[0]
        try:
            res = db.execute(
                text(f"SELECT * FROM {t_name} WHERE LOWER(uuid) = LOWER(:uuid)"),
                {"uuid": uuid_com},
            ).fetchone()
            if res:
                encontrado_pago = True
                print(f"   ✅ ¡ENCONTRADO en la tabla '{t_name}'!")
                # Extraemos e imprimimos la información cruda
                datos = dict(res._mapping) if hasattr(res, "_mapping") else dict(res)
                print(f"   👉 Datos crudos: {datos}")
        except:
            continue

    if not encontrado_pago:
        print(
            "   ❌ El UUID del complemento NO existe en ninguna tabla. Es un timbrado fantasma."
        )

    # 2. Analizar las Facturas y sus Pagos (Para ver por qué sale Parcialidad 2)
    print("\n2️⃣ ANALIZANDO FACTURAS RELACIONADAS Y SU HISTORIAL DE PAGOS")

    for folio in folios:
        print(f"\n--- Factura Folio: {folio} ---")
        try:
            # Rastrear la factura en sí
            query_inv = text(
                "SELECT id, folio_interno, uuid, total, saldo_insoluto, status FROM receivable_invoices WHERE folio_interno LIKE :folio"
            )
            factura = db.execute(query_inv, {"folio": f"%{folio}%"}).fetchone()

            if factura:
                f_data = (
                    dict(factura._mapping)
                    if hasattr(factura, "_mapping")
                    else dict(factura)
                )
                print(
                    f"   ✅ Factura en BD: ID={f_data['id']} | UUID={f_data['uuid']} | Total={f_data['total']} | Saldo Insoluto={f_data.get('saldo_insoluto', 'N/A')} | Status={f_data['status']}"
                )

                # Rastrear pagos en 'invoice_payments'
                try:
                    pagos = db.execute(
                        text(
                            "SELECT * FROM invoice_payments WHERE invoice_id = :inv_id"
                        ),
                        {"inv_id": f_data["id"]},
                    ).fetchall()
                    if pagos:
                        print(
                            f"   ⚠️ ADVERTENCIA: Tiene {len(pagos)} pago(s) registrado(s) en 'invoice_payments'."
                        )
                        for p in pagos:
                            p_data = (
                                dict(p._mapping) if hasattr(p, "_mapping") else dict(p)
                            )
                            print(
                                f"      -> Pago ID={p_data.get('id')}, Monto={p_data.get('amount', p_data.get('monto', 0))}, Status={p_data.get('status', 'N/A')}"
                            )
                    else:
                        print("   ✔️ Sin pagos en 'invoice_payments'.")
                except:
                    pass

                # Rastrear pagos en 'bank_movements' (usado en tu API)
                try:
                    movimientos = db.execute(
                        text("SELECT * FROM bank_movements WHERE invoice_id = :inv_id"),
                        {"inv_id": f_data["id"]},
                    ).fetchall()
                    if movimientos:
                        print(
                            f"   ⚠️ ADVERTENCIA: Tiene {len(movimientos)} movimiento(s) en 'bank_movements'."
                        )
                        for m in movimientos:
                            m_data = (
                                dict(m._mapping) if hasattr(m, "_mapping") else dict(m)
                            )
                            print(
                                f"      -> Movimiento ID={m_data.get('id')}, Monto={m_data.get('amount', m_data.get('monto', 0))}"
                            )
                except:
                    pass
            else:
                print(
                    f"   ❌ No se encontró la factura con folio {folio} en 'receivable_invoices'."
                )
        except Exception as e:
            print(f"   ❌ Error al leer factura: {e}")

    db.close()
    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    auditoria_fiscal()
