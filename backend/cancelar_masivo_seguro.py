import os
import sys
import time
from pathlib import Path
from sqlalchemy import or_, and_

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def auto_detectar_y_correr_incidencias():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🔍 [CAZADOR DE INCIDENCIAS] DETECTANDO FALSOS CANCELADOS Y ATORADOS EN BD")
    print("=" * 80)

    # 1. Estados que aceptamos abiertamente como atorados/en proceso
    ESTADOS_ATORADOS_SAT = [
        "TIMBRADA",
        "ERROR_SAT",
        "PROCESANDO",
        "PENDIENTE_CANCELAR_SAT",
        "PROCESO_CANCELACION",
    ]

    # 2. LOGICA RADAR DE "FALSOS CANCELADOS":
    # Buscaremos registros que localmente digan 'CANCELADO' en status_sat, pero que en el ERP
    # hayan tenido intentos de cancelación recientes hoy (2026-07-07) que pudieron haber fallado en el SAT.
    # O simplemente barremos las que tengan sospecha de desincronización.

    # -----------------------------------------------------------------
    # AMARRE AUTOMÁTICO 1: Cartas Porte Nominales ($1.12) en limbo
    # -----------------------------------------------------------------
    cartas_porte = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.is_nominal == True,
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.viaje_id.isnot(None),
            or_(
                ReceivableInvoice.status_sat.in_(ESTADOS_ATORADOS_SAT),
                # Radar dinámico: Captura si el ERP y el status_sat dicen CANCELADO pero
                # queremos forzar su validación real ante el SAT por sospecha de intermitencia
                and_(
                    ReceivableInvoice.status_sat == "CANCELADO",
                    ReceivableInvoice.updated_at
                    >= "2026-07-07 00:00:00",  # Filtra las modificadas hoy
                ),
            ),
        )
        .all()
    )

    # -----------------------------------------------------------------
    # AMARRE AUTOMÁTICO 2: Facturas Libres Serie F en limbo
    # -----------------------------------------------------------------
    facturas_f = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.folio_interno.like("F-%"),
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.estatus == "cancelado",  # Marcada como tirada en el ERP
            or_(
                ReceivableInvoice.status_sat.in_(ESTADOS_ATORADOS_SAT),
                and_(
                    ReceivableInvoice.status_sat == "CANCELADO",
                    ReceivableInvoice.updated_at
                    >= "2026-07-07 00:00:00",  # Filtra las modificadas hoy
                ),
            ),
        )
        .all()
    )

    print(f"📊 El radar automático detectó en el log de la BD:")
    print(f"   - [CP] Cartas Porte con sospecha de incidencia: {len(cartas_porte)}")
    print(f"   - [F]  Facturas Serie F con sospecha de incidencia: {len(facturas_f)}")
    print("-" * 80)

    exitos = 0
    errores = 0

    # 🛠️ EJECUCIÓN AUTOMÁTICA EN BLOQUE 1: CARTAS PORTE Nominales
    if len(cartas_porte) > 0:
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
                print(
                    f"🚀 [CP] Forzando validación SAT para: {cp.folio_interno} (UUID: {cp.uuid})..."
                )
                service.cancelar_factura_sat(
                    invoice_id=cp.id, motivo="01", uuid_sustituto=real.uuid
                )

                db.refresh(cp)
                cp.status_sat = "CANCELADO"
                cp.estatus = "cancelado"
                cp.saldo_pendiente = 0.0
                db.add(cp)
                db.commit()
                print("        ✅ CONFIRMADO SAT: Factura muerta y amarrada en ceros.")
                exitos += 1
            except Exception as e:
                error_msg = str(e).lower()
                if (
                    "previamente cancelado" in error_msg
                    or "ya se encuentra cancelado" in error_msg
                ):
                    print(
                        "        ✅ CONFIRMADO SAT: El SAT confirma que ya estaba previamente cancelada."
                    )
                    cp.status_sat = "CANCELADO"
                    cp.estatus = "cancelado"
                    cp.saldo_pendiente = 0.0
                    db.add(cp)
                    db.commit()
                    exitos += 1
                else:
                    # 🚨 LA VERDAD EN PANTALLA: Si el SAT la rechaza o da timeout, le quitamos la máscara
                    print(f"        ❌ RECHAZO REAL DEL SAT: {str(e)}")
                    cp.status_sat = "TIMBRADA"
                    cp.estatus = "pendiente"
                    cp.saldo_pendiente = cp.monto_total  # Le regresa la deuda al ERP
                    db.add(cp)
                    db.commit()
                    errores += 1
            time.sleep(1.5)

    # 🛠️ EJECUCIÓN AUTOMÁTICA EN BLOQUE 2: FACTURAS SERIE F
    if len(facturas_f) > 0:
        for f in facturas_f:
            try:
                print(
                    f"🚀 [F] Forzando validación SAT para: {f.folio_interno} (UUID: {f.uuid})..."
                )
                service.cancelar_factura_sat(
                    invoice_id=f.id, motivo="02", uuid_sustituto=None
                )

                db.refresh(f)
                f.status_sat = "CANCELADO"
                f.estatus = "cancelado"
                f.saldo_pendiente = 0.0
                db.add(f)
                db.commit()
                print("        ✅ CONFIRMADO SAT: Factura muerta y amarrada en ceros.")
                exitos += 1
            except Exception as e:
                error_msg = str(e).lower()
                if (
                    "previamente cancelado" in error_msg
                    or "ya se encuentra cancelado" in error_msg
                ):
                    print(
                        "        ✅ CONFIRMADO SAT: El SAT confirma que ya estaba previamente cancelada."
                    )
                    f.status_sat = "CANCELADO"
                    f.estatus = "cancelado"
                    f.saldo_pendiente = 0.0
                    db.add(f)
                    db.commit()
                    exitos += 1
                else:
                    # 🚨 LA VERDAD EN PANTALLA: Si el SAT la rechaza o da timeout, le quitamos la máscara
                    print(f"        ❌ RECHAZO REAL DEL SAT: {str(e)}")
                    f.status_sat = "TIMBRADA"
                    f.estatus = "pendiente"
                    f.saldo_pendiente = f.monto_total  # Le regresa la deuda al ERP
                    db.add(f)
                    db.commit()
                    errores += 1
            time.sleep(1.5)

    print("\n" + "=" * 80)
    print("🏁 AUDITORÍA DINÁMICA TERMINADA.")
    print(f"   - Sincronizadas y salvadas con éxito: {exitos}")
    print(
        f"   - Rebozadas por el SAT (Desenmascaradas como VIGENTES en tu ERP): {errores}"
    )
    print("=======================================================================\n")


if __name__ == "__main__":
    auto_detectar_y_correr_incidencias()
