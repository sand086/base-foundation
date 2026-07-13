import sys
from datetime import date
from pathlib import Path

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice, Client
from app.integrations.sat.billing_service import BillingService

UUID_A_CANCELAR = "58D2B363-1721-4E5E-8105-B42D56BD5EAA"
TOTAL = 44800.00
MOTIVO_SAT = "02"


def cancelar_factura_junta():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print(f"🚀 INICIANDO CANCELACIÓN DE EMERGENCIA (MODO SEGURO Y LIMPIO)")
    print("=" * 80)

    cliente_ref = db.query(Client).first()
    if not cliente_ref:
        print("❌ Error: No se encontró ningún cliente en la BD local.")
        return

    # 1. Creamos la factura para que el servicio oficial la encuentre
    factura_temp = ReceivableInvoice(
        client_id=cliente_ref.id,
        uuid=UUID_A_CANCELAR,
        folio_interno="TEMP-DELETE",
        estatus="pendiente",
        status_sat="VIGENTE",
        monto_total=TOTAL,
        saldo_pendiente=TOTAL,
        fecha_emision=date.today(),
        fecha_vencimiento=date.today(),
    )

    try:
        # 2. La guardamos temporalmente en BD
        db.add(factura_temp)
        db.commit()
        db.refresh(factura_temp)

        print(
            f"⏳ Enviando petición de cancelación al PAC/SAT para el UUID: {UUID_A_CANCELAR} ..."
        )

        # 3. Disparamos tu lógica oficial
        service.cancelar_factura_sat(
            invoice_id=factura_temp.id, motivo=MOTIVO_SAT, uuid_sustituto=None
        )

        print("✅ ¡ÉXITO! La orden de cancelación fue aceptada por el PAC.")
        print("🚨 Dile a tu cliente que la acepte en su Buzón Tributario.")

    except Exception as e:
        error_msg = str(e).lower()
        if (
            "ya se encuentra cancelado" in error_msg
            or "comprobante cancelado" in error_msg
        ):
            print("ℹ️ El SAT informa que esta factura YA ESTABA CANCELADA previamente.")
        else:
            print(f"❌ Error devuelto por el PAC: {e}")

    finally:
        # 4. LIMPIEZA INMEDIATA: Borramos todo rastro sin importar el resultado
        print("🧹 Limpiando base de datos local (Eliminando registro fantasma)...")
        db.query(ReceivableInvoice).filter(
            ReceivableInvoice.id == factura_temp.id
        ).delete()
        db.commit()
        print("✨ Base de datos local intacta y sin basura. Todo listo.")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    cancelar_factura_junta()
