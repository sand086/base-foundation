import sys
import os
import logging
import csv
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append("/app")

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoicePayment
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s %(message)s"
)
logger = logging.getLogger("cancelacion_pagos")

# =====================================================================
# COMPLEMENTOS DE PAGO A CANCELAR - MOTIVO 02 (SIN SUSTITUCIÓN)
# =====================================================================

UUIDS_A_CANCELAR = [
    {"uuid": "1D737C01-A9DB-45CA-A1E2-6F32E53108CE", "motivo": "02"},
    {"uuid": "862E6BD6-37C0-461B-82A5-9548E8891322", "motivo": "02"},
]

def disparar_cancelacion_sat():
    logger.info(
        f"Iniciando proceso de cancelación Motivo 02 para {len(UUIDS_A_CANCELAR)} Complementos de Pago..."
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"/app/evidencia_cancelacion_pagos_{timestamp}.csv"

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        logger.info(f"Conectando al PAC: {service.wsdl_timbrado}")
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(["UUID_Cancelado", "Motivo", "Status_SAT", "Mensaje_SAT"])

            for item in UUIDS_A_CANCELAR:
                uuid_cp = item["uuid"]
                motivo = item["motivo"]

                # Verificar existencia en BD local (Opcional, pero recomendado)
                documento_local = (
                    db.query(ReceivableInvoicePayment)
                    .filter(ReceivableInvoicePayment.complemento_uuid == uuid_cp)
                    .first()
                )

                if not documento_local:
                    logger.warning(
                        f"⚠️ El UUID {uuid_cp} no se encontró en la BD local, pero se intentará cancelar en el SAT de todos modos."
                    )

                # Cadena para Motivo 02 (Formato SAT: UUID|02|)
                cadena = f"{uuid_cp}|02|"
                logger.info(f"🚀 Enviando orden de cancelación al SAT: {cadena}")

                try:
                    resultado = client_zeep.service.cancelar(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        uuids=[cadena],
                        derCertCSD=cer_bytes,
                        derKeyCSD=key_bytes,
                        contrasenaCSD=service.key_password,
                    )

                    if hasattr(resultado, "resultados") and resultado.resultados:
                        res = resultado.resultados[0]
                        u_res = str(getattr(res, "uuid", uuid_cp)).strip().upper()
                        st_res = str(getattr(res, "status", "Sin Status"))
                        msg_res = str(getattr(res, "mensaje", "Sin Mensaje")).lower()

                        logger.info(
                            f"   SAT Respondió -> Código: {st_res} | Mensaje: {msg_res}"
                        )

                        uuid_puro_busqueda = u_res.split("|")[0].strip()

                        # Actualizar el estado en la base de datos
                        documento = (
                            db.query(ReceivableInvoicePayment)
                            .filter(ReceivableInvoicePayment.complemento_uuid == uuid_puro_busqueda)
                            .first()
                        )

                        if documento:
                            if (
                                "error" in msg_res
                                or "no cancelable" in msg_res
                                or "rechaz" in msg_res
                                or st_res in ["500", "621"]
                            ):
                                documento.estatus = "ERROR_CANCELACION"
                                logger.error(f"   ❌ Rechazo/Error SAT.")

                            elif st_res == "201" or "proceso" in msg_res:
                                documento.estatus = "PROCESO_CANCELACION"
                                documento.fecha_cancelacion = datetime.utcnow()
                                logger.info(f"   ⏳ En proceso de cancelación.")

                            elif (
                                st_res == "202"
                                or "previamente cancelado" in msg_res
                                or "ya se encuentra cancelado" in msg_res
                                or (st_res == "200" and "exito" in msg_res)
                            ):
                                documento.estatus = "CANCELADO"
                                documento.motivo_cancelacion = motivo
                                documento.fecha_cancelacion = datetime.utcnow()
                                logger.info(f"   ✅ Cancelación Exitosa confirmada en BD.")
                            
                            db.commit()

                        writer.writerow([u_res, motivo, st_res, msg_res])
                    else:
                        logger.warning(
                            f"   ⚠️ El PAC no devolvió desglose para {uuid_cp}"
                        )

                except Exception as e_indiv:
                    logger.error(
                        f"   ❌ Error de conexión al procesar {uuid_cp}: {e_indiv}"
                    )

        logger.info(f"📁 Evidencia guardada en: {csv_filename}")

    except Exception as e_general:
        logger.error(f"❌ Error fatal: {e_general}")
    finally:
        db.close()
        logger.info("Proceso terminado.")

if __name__ == "__main__":
    disparar_cancelacion_sat()