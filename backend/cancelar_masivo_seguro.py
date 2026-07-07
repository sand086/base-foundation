import sys
import time
from pathlib import Path

# Configurar el path
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def remate_final():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🎯 [FRANCOTIRADOR] LIQUIDANDO LAS ÚLTIMAS 6 INCIDENCIAS DEL LOG")
    print("=" * 80)

    # Las de Error 200: Forzaremos Motivo 02
    folios_motivo_02 = ["CP-17565", "CP-17433"]

    # Las de Error 500: Reintentaremos Motivo 01 normal
    folios_motivo_01 = ["CP-17439", "CP-17823", "CP-17826", "CP-17921"]

    todas_las_incidencias = folios_motivo_02 + folios_motivo_01

    facturas = (
        db.query(ReceivableInvoice)
        .filter(ReceivableInvoice.folio_interno.in_(todas_las_incidencias))
        .all()
    )

    for fac in facturas:
        try:
            motivo = "02" if fac.folio_interno in folios_motivo_02 else "01"
            uuid_relacionado = None

            if motivo == "01":
                real = (
                    db.query(ReceivableInvoice)
                    .filter(
                        ReceivableInvoice.viaje_id == fac.viaje_id,
                        ReceivableInvoice.is_nominal == False,
                        ReceivableInvoice.status_sat == "TIMBRADA",
                    )
                    .first()
                )
                if real:
                    uuid_relacionado = real.uuid

            print(f"🚀 Disparando a {fac.folio_interno} (Motivo: {motivo})...")

            service.cancelar_factura_sat(
                invoice_id=fac.id, motivo=motivo, uuid_sustituto=uuid_relacionado
            )

            # Éxito: Guardamos cambios
            db.refresh(fac)
            fac.status_sat = "CANCELADO"
            fac.estatus = "cancelado"
            fac.saldo_pendiente = 0.0
            db.add(fac)
            db.commit()
            print("   ✅ LIQUIDADA: Cancelación exitosa en SAT y BD.")

        except Exception as e:
            error_msg = str(e).lower()
            if (
                "previamente cancelado" in error_msg
                or "ya se encuentra cancelado" in error_msg
            ):
                print("   ✅ LIQUIDADA: El SAT dice que ya estaba cancelada.")
                fac.status_sat = "CANCELADO"
                fac.estatus = "cancelado"
                fac.saldo_pendiente = 0.0
                db.add(fac)
                db.commit()
            else:
                print(f"   ❌ RECHAZO: {str(e)}")
                # Mantenemos la verdad en la BD
                fac.status_sat = "TIMBRADA"
                fac.estatus = "pendiente"
                fac.saldo_pendiente = fac.monto_total
                db.add(fac)
                db.commit()

        time.sleep(1.5)

    print("\n" + "=" * 80)
    print(
        "🏁 FRANCOTIRADOR TERMINADO. Solo faltaría cancelar a mano CP-1 y CP-2 en la web del SAT."
    )
    print("=======================================================================\n")


if __name__ == "__main__":
    remate_final()
