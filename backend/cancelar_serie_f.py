import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el entorno para heredar los módulos
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.integrations.sat.api_billing import reconstruir_pdf_factura


def levantar_pdf_huerfano():
    db = next(get_db())
    uuid_pago = "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF"

    print("\n" + "=" * 80)
    print("🔨 FORZANDO LA RECONSTRUCCIÓN NATIVA DEL PDF")
    print("=" * 80)

    try:
        # 1. Conseguimos el ID numérico que tu función necesita
        query = text("SELECT id FROM receivable_invoices WHERE uuid = :uuid")
        result = db.execute(query, {"uuid": uuid_pago}).fetchone()

        if not result:
            print("❌ Error: No se encontró ese UUID en la tabla receivable_invoices.")
            return

        invoice_id = result[0]
        print(f"🔍 Registro localizado en BD (ID: {invoice_id})")

        # 2. Invocamos la función del sistema para que cree el archivo en el disco
        print("⏳ Ejecutando motor de diseño sobre el XML... Por favor espera.")
        reconstruir_pdf_factura(invoice_id=invoice_id, db=db)

        print(
            "✅ ¡Éxito absoluto! El archivo PDF ha sido regenerado en su ruta física."
        )

    except Exception as e:
        print(f"❌ Error al intentar compilar el PDF: {e}")
    finally:
        db.close()
        print("=" * 80 + "\n")


if __name__ == "__main__":
    levantar_pdf_huerfano()
