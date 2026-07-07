import sys
import time
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def matar_factura_colgada():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🧨 [ROMPE-CANDADOS] FORZANDO BAJA CON MOTIVO 02 PARA FACTURAS COLGADAS")
    print("=" * 80)

    # 📋 1. METE AQUÍ EL UUID QUE SIGUE "VIGENTE" EN LA PÁGINA DEL SAT A PESAR DE TODO
    uuid_rebelde = "8B62AAA4-1610-47B6-8417-E96C78A0648A"  # Este es el de tu CP-17765

    # 2. Busca la factura en tu base de datos
    fac = (
        db.query(ReceivableInvoice)
        .filter(ReceivableInvoice.uuid == uuid_rebelde)
        .first()
    )

    if not fac:
        print(f"❌ Error: El UUID {uuid_rebelde} no existe en tu base de datos local.")
        return

    print(
        f"🚀 Disparando a {fac.folio_interno} (UUID: {fac.uuid}) con Motivo 02 forzado..."
    )

    try:
        # 3. 🚨 EL TRUCO: Le mandamos Motivo 02 para obligar al SAT a ignorar el amonestamiento
        service.cancelar_factura_sat(
            invoice_id=fac.id, motivo="02", uuid_sustituto=None
        )

        # 4. Aseguramos que la BD esté alineada al éxito
        db.refresh(fac)
        fac.status_sat = "CANCELADO"
        fac.estatus = "cancelado"
        fac.saldo_pendiente = 0.0
        db.add(fac)
        db.commit()
        print("   ✅ MISIÓN CUMPLIDA: Factura ejecutada con éxito ante el SAT.")
        print(
            "   👉 Ve a la página del SAT ahora mismo, dale 'Refrescar' y ya debería decir Cancelada."
        )

    except Exception as e:
        error_msg = str(e).lower()
        if (
            "previamente cancelado" in error_msg
            or "ya se encuentra cancelado" in error_msg
        ):
            print(
                "   ✅ EL SAT CONFIRMA: Dice que ya la mató allá (Refresca tu página web del SAT)."
            )
            fac.status_sat = "CANCELADO"
            fac.estatus = "cancelado"
            fac.saldo_pendiente = 0.0
            db.add(fac)
            db.commit()
        else:
            print(f"   ❌ RECHAZO DEFINITIVO DEL SAT: {str(e)}")
            # Si a pesar del Motivo 02 te la rebota, el problema es grave en el SAT.
            # Regresamos el ERP a la realidad para que el cliente no vea mentiras.
            fac.status_sat = "TIMBRADA"
            fac.estatus = "pendiente"
            fac.saldo_pendiente = fac.monto_total
            db.add(fac)
            db.commit()

    print("\n" + "=" * 80)


if __name__ == "__main__":
    matar_factura_colgada()
