import sys
import time
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def limpiar_viajes_saturados():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🧨 [ROMPE-CANDADOS] FORZANDO BAJA CON MOTIVO 02 (IGNORANDO SUSTITUCIÓN)")
    print("=" * 80)

    # 📋 Ponemos los UUIDs que sabemos que están vivos en el SAT
    uuids_rebeldes = [
        "591A73C1-431E-4474-A144-98323FC0BF96",  # CP-17603 (La de tu imagen)
        "C2521684-DDC0-4EB8-A01A-BA21B021CA91",  # CP-17617 (Sospechosa del mismo viaje)
        "9844A2E9-E7B4-4AB3-9956-75D5D2954E08",  # CP-17618 (Sospechosa del mismo viaje)
    ]

    facturas = (
        db.query(ReceivableInvoice)
        .filter(ReceivableInvoice.uuid.in_(uuids_rebeldes))
        .all()
    )

    for fac in facturas:
        print(
            f"🚀 Disparando a {fac.folio_interno} (UUID: {fac.uuid}) con Motivo 02 forzado..."
        )

        try:
            # 🚨 EL TRUCO: Motivo 02 a la fuerza
            service.cancelar_factura_sat(
                invoice_id=fac.id, motivo="02", uuid_sustituto=None
            )

            db.refresh(fac)
            fac.status_sat = "CANCELADO"
            fac.estatus = "cancelado"
            fac.saldo_pendiente = 0.0
            db.add(fac)
            db.commit()
            print("   ✅ MISIÓN CUMPLIDA: Factura ejecutada con éxito ante el SAT.")

        except Exception as e:
            error_msg = str(e).lower()
            if (
                "previamente cancelado" in error_msg
                or "ya se encuentra cancelado" in error_msg
            ):
                print("   ✅ EL SAT CONFIRMA: Ya estaba muerta allá.")
                fac.status_sat = "CANCELADO"
                fac.estatus = "cancelado"
                fac.saldo_pendiente = 0.0
                db.add(fac)
                db.commit()
            else:
                print(f"   ❌ RECHAZO DEFINITIVO DEL SAT: {str(e)}")
                # Si marca Error 305, es el certificado y se debe hacer a mano.
                fac.status_sat = "TIMBRADA"
                fac.estatus = "pendiente"
                fac.saldo_pendiente = fac.monto_total
                db.add(fac)
                db.commit()

        time.sleep(1.5)

    print("\n" + "=" * 80)


if __name__ == "__main__":
    limpiar_viajes_saturados()
