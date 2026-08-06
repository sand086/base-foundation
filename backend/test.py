import sys
import os
import logging
import csv
import time
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoicePayment
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("cancelar_reps")

# =====================================================================
# 📌 LOS 2 COMPLEMENTOS DE PAGO (REPs) HIJOS A CANCELAR (MOTIVO 02)
# =====================================================================
REPS_A_CANCELAR = [
    "80D0623C-523C-4626-93F9-4941CF38640D|02|",
    "2EE7E4C8-3343-4129-8EE2-52362B9749F3|02|",
]

# IDs de los registros en la tabla receivable_invoice_payments para verificar
PAGOS_IDS_BD = [185, 186, 187, 223]


def disparar_cancelacion_reps():
    db = SessionLocal()
    service = PaymentComplementService(db)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_cancelacion_reps_{timestamp}.csv"

    logger.info(
        f"🚀 Iniciando cancelación de {len(REPS_A_CANCELAR)} Complementos de Pago (REPs)..."
    )

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(
                [
                    "UUID_REP_Hijo",
                    "Status_SAT",
                    "Mensaje_SAT",
                    "Registros_BD_Actualizados",
                ]
            )

            for param in REPS_A_CANCELAR:
                uuid_puro = param.split("|")[0]
                logger.info(f"🔪 Enviando cancelación para REP Hijo: {uuid_puro}")

                try:
                    resultado = client_zeep.service.cancelar(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        uuids=[param],
                        derCertCSD=cer_bytes,
                        derKeyCSD=key_bytes,
                        contrasenaCSD=service.key_password,
                    )

                    res_sat = resultado.resultados[0]
                    codigo = getattr(res_sat, "status", 0)
                    mensaje = str(getattr(res_sat, "mensaje", "")).lower()

                    actualizados_count = 0

                    # Buscar y actualizar en receivable_invoice_payments
                    pagos_bd = (
                        db.query(ReceivableInvoicePayment)
                        .filter(ReceivableInvoicePayment.complemento_uuid == uuid_puro)
                        .all()
                    )

                    if pagos_bd:
                        for pago in pagos_bd:
                            if (
                                codigo in [201, 202, 211]
                                or "proceso" in mensaje
                                or "previamente" in mensaje
                                or "exito" in mensaje
                            ):
                                pago.estatus = "cancelado"
                                pago.motivo_cancelacion = "02"
                                pago.detalle_sat = f"REP Cancelado SAT: {mensaje}"
                                pago.fecha_cancelacion = datetime.utcnow()
                                actualizados_count += 1
                                logger.info(
                                    f"   ✅ Pago ID BD [{pago.id}] de REP {uuid_puro} -> Marcado como 'cancelado'"
                                )
                            else:
                                pago.detalle_sat = f"Rechazo Cancelacion REP: {mensaje}"
                                logger.warning(
                                    f"   ⚠️ Rechazo en Pago ID BD [{pago.id}]: {mensaje}"
                                )

                        db.commit()
                    else:
                        logger.error(
                            f"   ❌ No se encontraron pagos en BD con el REP UUID: {uuid_puro}"
                        )

                    writer.writerow([uuid_puro, codigo, mensaje, actualizados_count])

                except Exception as e_peticion:
                    logger.error(
                        f"   ❌ Error al enviar petición para {uuid_puro}: {e_peticion}"
                    )
                    writer.writerow([uuid_puro, "ERROR", str(e_peticion), 0])

                time.sleep(1.5)

        logger.info(f"\n📁 Proceso finalizado. Evidencia guardada en: {csv_filename}")

    except Exception as e_gen:
        logger.error(f"❌ Error crítico: {e_gen}")
    finally:
        db.close()


if __name__ == "__main__":
    disparar_cancelacion_reps()
