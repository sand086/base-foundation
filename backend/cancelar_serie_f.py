import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db
from app.integrations.sat.billing_service import BillingService


def cancelar_via_pac():
    db = next(get_db())
    uuid_a_cancelar = "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF"

    print("\n" + "=" * 80)
    print(f"📡 ENVIANDO ORDEN DE CANCELACIÓN AL PAC PARA EL UUID: {uuid_a_cancelar}")
    print("=" * 80)

    # Buscamos una factura válida para usarla como puente
    res = db.execute(
        text("SELECT id, uuid FROM receivable_invoices WHERE uuid IS NOT NULL LIMIT 1")
    ).fetchone()

    if not res:
        print("❌ No se encontró ninguna factura para usar como puente.")
        db.close()
        return

    id_puente = res[0]
    uuid_original = res[1]

    try:
        # 1. Inyectar temporalmente el UUID en la base de datos
        print("🔄 Preparando entorno para enviar la orden al PAC...")
        db.execute(
            text("UPDATE receivable_invoices SET uuid = :malo WHERE id = :id"),
            {"malo": uuid_a_cancelar, "id": id_puente},
        )
        db.commit()

        # 2. Enviar cancelación usando tu servicio
        service = BillingService(db)
        print("⏳ Disparando petición SOAP al PAC (Motivo 02)...")
        service.cancelar_factura_sat(invoice_id=id_puente, motivo="02")
        print("✅ ¡ÉXITO! El PAC procesó la cancelación correctamente.")

    except Exception as e:
        print(f"⚠️ El PAC devolvió un mensaje: {e}")
        print(
            "💡 (Si el PAC indica que ya está cancelado o en proceso, el objetivo se cumplió)."
        )

    finally:
        # 3. Restaurar la factura puente siempre, aunque el PAC falle o marque error
        db.execute(
            text("UPDATE receivable_invoices SET uuid = :orig WHERE id = :id"),
            {"orig": uuid_original, "id": id_puente},
        )
        db.commit()
        print("🧹 Base de datos restaurada y segura. (Puente devuelto a la normalidad)")

    db.close()
    print("=" * 80 + "\n")


if __name__ == "__main__":
    cancelar_via_pac()
