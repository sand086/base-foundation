import sys
import time
import datetime
from pathlib import Path
from sqlalchemy import or_, and_

sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def barredora_con_log():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🔍 INICIANDO BARRIDO CON GENERACIÓN DE LOG DE INCIDENCIAS")
    print("=" * 80)

    ESTADOS_ATORADOS_SAT = [
        "TIMBRADA",
        "ERROR_SAT",
        "PROCESANDO",
        "PENDIENTE_CANCELAR_SAT",
        "PROCESO_CANCELACION",
    ]

    cartas_porte = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.is_nominal == True,
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.viaje_id.isnot(None),
            or_(
                ReceivableInvoice.status_sat.in_(ESTADOS_ATORADOS_SAT),
                and_(
                    ReceivableInvoice.status_sat == "CANCELADO",
                    ReceivableInvoice.updated_at >= "2026-07-07 00:00:00",
                ),
            ),
        )
        .all()
    )

    facturas_f = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.folio_interno.like("F-%"),
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.estatus == "cancelado",
            or_(
                ReceivableInvoice.status_sat.in_(ESTADOS_ATORADOS_SAT),
                and_(
                    ReceivableInvoice.status_sat == "CANCELADO",
                    ReceivableInvoice.updated_at >= "2026-07-07 00:00:00",
                ),
            ),
        )
        .all()
    )

    print(
        f"📊 Analizando facturas...\n   - CP a revisar: {len(cartas_porte)}\n   - F a revisar: {len(facturas_f)}"
    )

    # 🚨 AQUÍ CREAMOS EL LOG AUTOMÁTICO
    nombre_log = (
        f"incidencias_sat_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}.txt"
    )
    archivo_log = open(nombre_log, "w")
    archivo_log.write(
        "=== LOG DE FACTURAS RECHAZADAS POR EL SAT O CON ERROR 500 ===\n\n"
    )

    exitos = 0
    errores = 0

    # BLOQUE 1: CARTAS PORTE
    for cp in cartas_porte:
        real = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.viaje_id == cp.viaje_id,
                ReceivableInvoice.is_nominal == False,
                ReceivableInvoice.status_sat == "TIMBRADA",
            )
            .first()
        )
        if not real:
            continue

        try:
            print(f"🚀 [CP] Forzando validación SAT para: {cp.folio_interno}...")
            service.cancelar_factura_sat(
                invoice_id=cp.id, motivo="01", uuid_sustituto=real.uuid
            )
            db.refresh(cp)
            cp.status_sat = "CANCELADO"
            cp.estatus = "cancelado"
            cp.saldo_pendiente = 0.0
            db.add(cp)
            db.commit()
            exitos += 1
        except Exception as e:
            error_msg = str(e).lower()
            if (
                "previamente cancelado" in error_msg
                or "ya se encuentra cancelado" in error_msg
            ):
                cp.status_sat = "CANCELADO"
                cp.estatus = "cancelado"
                cp.saldo_pendiente = 0.0
                db.add(cp)
                db.commit()
                exitos += 1
            else:
                # 🚨 ESCRIBE EN EL LOG EL FOLIO QUE FALLÓ Y EL MOTIVO EXACTO
                print(f"        ❌ RECHAZO SAT (Registrado en Log): {str(e)}")
                archivo_log.write(
                    f"FOLIO: {cp.folio_interno} | UUID: {cp.uuid} | ERROR: {str(e)}\n"
                )

                # Le quita la mentira y la regresa a VIGENTE
                cp.status_sat = "TIMBRADA"
                cp.estatus = "pendiente"
                cp.saldo_pendiente = cp.monto_total
                db.add(cp)
                db.commit()
                errores += 1
        time.sleep(1.5)

    # BLOQUE 2: FACTURAS F
    for f in facturas_f:
        try:
            print(f"🚀 [F] Forzando validación SAT para: {f.folio_interno}...")
            service.cancelar_factura_sat(
                invoice_id=f.id, motivo="02", uuid_sustituto=None
            )
            db.refresh(f)
            f.status_sat = "CANCELADO"
            f.estatus = "cancelado"
            f.saldo_pendiente = 0.0
            db.add(f)
            db.commit()
            exitos += 1
        except Exception as e:
            error_msg = str(e).lower()
            if (
                "previamente cancelado" in error_msg
                or "ya se encuentra cancelado" in error_msg
            ):
                f.status_sat = "CANCELADO"
                f.estatus = "cancelado"
                f.saldo_pendiente = 0.0
                db.add(f)
                db.commit()
                exitos += 1
            else:
                # 🚨 ESCRIBE EN EL LOG
                print(f"        ❌ RECHAZO SAT (Registrado en Log): {str(e)}")
                archivo_log.write(
                    f"FOLIO: {f.folio_interno} | UUID: {f.uuid} | ERROR: {str(e)}\n"
                )

                # Le quita la mentira y la regresa a VIGENTE
                f.status_sat = "TIMBRADA"
                f.estatus = "pendiente"
                f.saldo_pendiente = f.monto_total
                db.add(f)
                db.commit()
                errores += 1
        time.sleep(1.5)

    archivo_log.close()

    print("\n" + "=" * 80)
    print(f"🏁 BARRIDO TERMINADO.")
    print(f"   - Exitosas: {exitos}")
    print(f"   - Con Error: {errores}")
    print(
        f"   📁 ¡Se ha guardado un archivo '{nombre_log}' con las {errores} facturas exactas que fallaron!"
    )
    print("=======================================================================\n")


if __name__ == "__main__":
    barredora_con_log()
