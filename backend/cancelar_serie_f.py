import os
import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db


def limpieza_quirurgica():
    db = next(get_db())

    # Los IDs exactos de las facturas afectadas según tu auditoría
    invoice_ids = (331, 222, 115, 108, 105, 87, 745)
    uuid_com = "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF"

    print("\n" + "=" * 80)
    print("🩹 INICIANDO CIRUGÍA DE BASE DE DATOS")
    print("=" * 80)

    try:
        # 1. Borrar de raíz todos los pagos (activos y cancelados) de estas facturas
        # Esto garantiza que el sistema calcule "Parcialidad 1" al hacer el nuevo pago
        res_pagos = db.execute(
            text(
                f"DELETE FROM receivable_invoice_payments WHERE invoice_id IN {invoice_ids}"
            )
        )
        print(
            f"✅ Se eliminaron {res_pagos.rowcount} registros de pagos (limpiando el historial de parcialidades)."
        )

        # 2. Restaurar las facturas a su estado original (Pendientes y con saldo completo)
        res_inv = db.execute(
            text(
                f"UPDATE receivable_invoices SET saldo_pendiente = monto_total, estatus = 'pendiente' WHERE id IN {invoice_ids}"
            )
        )
        print(
            f"✅ Se restauraron {res_inv.rowcount} facturas a estatus 'pendiente' y saldo intacto."
        )

        db.commit()
        print("💾 Cambios guardados en la base de datos de forma segura.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error en la base de datos: {e}")

    # 3. Limpiar los archivos físicos corruptos
    backend_dir = Path(__file__).resolve().parent
    xml_path = backend_dir / "app" / "storage" / "xml_timbrados" / f"{uuid_com}.xml"
    pdf_path = backend_dir / "app" / "storage" / "xml_timbrados" / f"{uuid_com}.pdf"

    if xml_path.exists():
        os.remove(xml_path)
        print("🗑️ XML del complemento fulminado del disco.")
    if pdf_path.exists():
        os.remove(pdf_path)
        print("🗑️ PDF del complemento fulminado del disco.")

    db.close()
    print("\n🚀 CIRUGÍA EXITOSA. TODO LISTO PARA REGENERAR DESDE LA INTERFAZ.")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    limpieza_quirurgica()
