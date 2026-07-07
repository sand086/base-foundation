import sys
import time
import datetime
from pathlib import Path
from sqlalchemy import or_

sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService


def ejecutor_inteligente_sat():
    db = next(get_db())
    service = BillingService(db)

    print("\n" + "=" * 80)
    print("🧠 [AUTO-PILOTO] INICIANDO BARRIDO INTELIGENTE CON REGLA DE VIAJES Y LOG")
    print("=" * 80)

    # 1. Buscamos las CPs de $1 peso de Junio 2026 a la fecha que requieran revisión
    # Buscamos tanto las que dicen CANCELADO (falsos ok) como las TIMBRADA (que rebotaron con 500 antes)
    facturas = (
        db.query(ReceivableInvoice)
        .filter(
            ReceivableInvoice.is_nominal == True,
            ReceivableInvoice.uuid.isnot(None),
            ReceivableInvoice.viaje_id.isnot(None),
            ReceivableInvoice.status_sat.in_(["CANCELADO", "TIMBRADA"]),
            ReceivableInvoice.created_at >= "2026-06-01 00:00:00",
        )
        .all()
    )

    print(
        f"📋 Universo analizado: {len(facturas)} Cartas Porte Nominales de Junio/Julio."
    )

    # Creación del Log para Errores 500 (Para poder correrlos después fácilmente)
    nombre_log = "reintentos_500.txt"
    log_file = open(nombre_log, "a")  # 'a' para ir acumulando si corres varias veces

    exitos = 0
    ya_canceladas = 0
    errores_500 = 0
    errores_cert = 0

    for fac in facturas:
        # 🚨 REGLA INTELIGENTE QUE PROPUSISTE: Contar cuántas CPs tiene este viaje
        conteo_cps = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.viaje_id == fac.viaje_id,
                ReceivableInvoice.is_nominal == True,
            )
            .count()
        )

        # Determinamos el motivo ideal según tu regla
        if conteo_cps > 1:
            motivo = "02"
            uuid_sustituto = None
            detalle_regla = (
                f"⚠️ VIAJE MULTI-CP ({conteo_cps} CPs detectadas) -> FORZANDO MOTIVO 02"
            )
        else:
            motivo = "01"
            # Buscamos la factura real del viaje para asociarla
            real = (
                db.query(ReceivableInvoice)
                .filter(
                    ReceivableInvoice.viaje_id == fac.viaje_id,
                    ReceivableInvoice.is_nominal == False,
                    ReceivableInvoice.status_sat == "TIMBRADA",
                )
                .first()
            )
            uuid_sustituto = real.uuid if real else None
            detalle_regla = "✅ CP ÚNICA -> Aplicando Motivo 01 (Sustitución estándar)"

        print(f"\n🚀 Procesando {fac.folio_interno} (Viaje ID: {fac.viaje_id})")
        print(f"   {detalle_regla}")

        try:
            # Orden de cancelación al PAC/SAT
            service.cancelar_factura_sat(
                invoice_id=fac.id, motivo=motivo, uuid_sustituto=uuid_sustituto
            )

            # Sincronización exitosa en BD
            db.refresh(fac)
            fac.status_sat = "CANCELADO"
            fac.estatus = "cancelado"
            fac.saldo_pendiente = 0.0
            db.add(fac)
            db.commit()
            print("   ✅ ÉXITO: Cancelada y amarrada en el SAT.")
            exitos += 1

        except Exception as e:
            error_msg = str(e).lower()

            # Si el SAT dice que ya estaba muerta, la grabamos como cancelada y avanzamos
            if (
                "previamente cancelado" in error_msg
                or "ya se encuentra cancelado" in error_msg
            ):
                print(
                    "   👌 EN ORDEN: El SAT confirma que ya estaba cancelada anteriormente."
                )
                db.refresh(fac)
                fac.status_sat = "CANCELADO"
                fac.estatus = "cancelado"
                fac.saldo_pendiente = 0.0
                db.add(fac)
                db.commit()
                ya_canceladas += 1

            # 🚨 SI DA ERROR 500: SE GUARDA EN TU LOG PARA LOGO
            elif "500" in error_msg or "tardado demasiado" in error_msg:
                print(
                    "   ❌ ERROR 500 (SAT lento): Guardado en reintentos_500.txt para correrlo después."
                )
                log_file.write(f"{fac.uuid}\n")  # Guardamos solo el UUID limpio

                # Desmascaramos en el ERP para que el sistema muestre la verdad mientras reintentas
                db.refresh(fac)
                fac.status_sat = "TIMBRADA"
                fac.estatus = "pendiente"
                fac.saldo_pendiente = fac.monto_total
                db.add(fac)
                db.commit()
                errores_500 += 1

            # Cualquier otro error (Como el criptográfico 305 de los sellos)
            else:
                print(f"   ❌ RECHAZO OPERATIVO: {str(e)}")
                db.refresh(fac)
                fac.status_sat = "TIMBRADA"
                fac.estatus = "pendiente"
                db.add(fac)
                db.commit()
                errores_cert += 1

        time.sleep(1.5)

    log_file.close()

    print("\n" + "=" * 80)
    print("🏁 RESUMEN GENERAL DEL AUTO-PILOTO:")
    print(f"   - Canceladas en esta corrida: {exitos}")
    print(f"   - Ya estaban canceladas correctamente: {ya_canceladas}")
    print(f"   - 📑 Atoradas por Error 500 (Guardadas en log): {errores_500}")
    print(f"   - Rechazos por sellos/otros (Requieren portal web): {errores_cert}")
    print("=======================================================================\n")


if __name__ == "__main__":
    ejecutor_inteligente_sat()
