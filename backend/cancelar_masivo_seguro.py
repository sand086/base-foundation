import sys
import time
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def barrido_motivo_02_automatico():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🧨 [BARRIDO AUTOMÁTICO] CAZANDO FANTASMAS Y FORZANDO MOTIVO 02")
    print("=" * 80)

    # 🔍 LA MAGIA: Buscar TODAS las Cartas Porte de $1 peso que el ERP jura
    # que están canceladas, pero que queremos forzar para destrabar al SAT.
    # (Filtramos desde junio de 2026 para no escanear años anteriores a lo tonto)
    facturas = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.is_nominal == True,
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.status_sat == "CANCELADO",
            ReceivableInvoice.created_at >= "2026-06-01 00:00:00",
        )
        .all()
    )

    total = len(facturas)
    print(
        f"📋 Se encontraron {total} Cartas Porte Nominales recientes marcadas como Canceladas."
    )
    print("⏳ Verificando su estado real ante el SAT...\n")

    exitos = 0
    ya_muertas = 0
    errores = 0

    for fac in facturas:
        print(f"🚀 Verificando {fac.folio_interno} (UUID: {fac.uuid})...")

        try:
            # 🚨 DISPARO A QUEMARROPA: Motivo 02 a la fuerza
            service.cancelar_factura_sat(
                invoice_id=fac.id, motivo="02", uuid_sustituto=None
            )

            db.refresh(fac)
            fac.status_sat = "CANCELADO"
            fac.estatus = "cancelado"
            fac.saldo_pendiente = 0.0
            db.add(fac)
            db.commit()
            print(
                "   ✅ FANTASMA ELIMINADO: Estaba Vigente en el SAT, pero ya la matamos."
            )
            exitos += 1

        except Exception as e:
            error_msg = str(e).lower()
            if (
                "previamente cancelado" in error_msg
                or "ya se encuentra cancelado" in error_msg
            ):
                print(
                    "   👌 TODO EN ORDEN: El SAT confirma que sí estaba cancelada de verdad."
                )
                ya_muertas += 1
            else:
                print(f"   ❌ RECHAZO CRÍTICO (Posible Error 305): {str(e)}")
                # Si a pesar del Motivo 02 el SAT la protege, es bronca del Certificado.
                # Desenmascaramos la factura en el ERP para arreglarla a mano.
                fac.status_sat = "TIMBRADA"
                fac.estatus = "pendiente"
                fac.saldo_pendiente = fac.monto_total
                db.add(fac)
                db.commit()
                errores += 1

        time.sleep(1.5)  # Pausa para no saturar al SAT

    print("\n" + "=" * 80)
    print("🏁 REPORTE FINAL DEL BARRIDO:")
    print(f"   - Fantasmas eliminados (Destrabadas del SAT): {exitos}")
    print(f"   - Facturas que sí estaban bien (Sin cambios): {ya_muertas}")
    print(
        f"   - Facturas con error de Certificado 305 (Desbloqueadas en ERP): {errores}"
    )
    print("=======================================================================\n")


if __name__ == "__main__":
    barrido_motivo_02_automatico()
