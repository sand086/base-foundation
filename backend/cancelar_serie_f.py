import sys
import os
import logging
import csv
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoice, ReceivableInvoicePayment
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("cancelacion_forzada_cp")

# =====================================================================
#  MAPEO DE CANCELACIÓN (MOTIVO 01): CARTA PORTE -> FACTURA CHIDA
# =====================================================================

UUIDS_A_CANCELAR = [
    {
        "uuid": "D02009F3-24D6-48F3-9712-ECF8301B0A8E",
        "motivo": "01",
        "sustitucion": "B3B04BD3-3630-492C-95AF-5C6C86FBA4A9",
    },
    {
        "uuid": "48DAC70B-D391-489A-9E00-174D08EBF43F",
        "motivo": "01",
        "sustitucion": "919974C1-6C92-4333-B609-E910723F9C12",
    },
    {
        "uuid": "260F7CDD-EB4D-4561-A136-B21B23DE607E",
        "motivo": "01",
        "sustitucion": "AD8CA77A-BF64-4A14-9FFE-BCE40645E720",
    },
    {
        "uuid": "1BB238CA-FFEC-4FE8-BC02-B5CCC75EFDF7",
        "motivo": "01",
        "sustitucion": "E8C76589-71C2-417B-92D3-4A00C4D5C649",
    },
]


def disparar_cancelacion_sat():
    logger.info(
        f"Iniciando proceso de cancelación individual para {len(UUIDS_A_CANCELAR)} UUIDs..."
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_cancelacion_{timestamp}.csv"

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
            writer.writerow(
                ["UUID_Cancelado", "UUID_Sustituto", "Status_SAT", "Mensaje_SAT"]
            )

            for item in UUIDS_A_CANCELAR:
                uuid_cp = item["uuid"]
                uuid_sustituto = item["sustitucion"]

                # =======================================================================
                # 🛡️ SEGURO DE VIDA EXTREMO: Verificar el monto ANTES de mandar al SAT
                # =======================================================================
                documento_seguridad = (
                    db.query(ReceivableInvoice)
                    .filter(ReceivableInvoice.uuid == uuid_cp)
                    .first()
                )

                if not documento_seguridad:
                    logger.error(
                        f"❌ Abortando {uuid_cp}: No se encontró la factura en la Base de Datos local."
                    )
                    writer.writerow(
                        [
                            uuid_cp,
                            uuid_sustituto,
                            "ERROR_SEGURIDAD",
                            "UUID no existe en BD local",
                        ]
                    )
                    continue

                # Convertimos a float de forma segura para comparar
                monto_actual = float(documento_seguridad.monto_total or 0.0)

                # Tolerancia matemática simple por decimales (monto debe ser entre 1.11 y 1.13)
                if abs(monto_actual - 1.12) > 0.01:
                    logger.error(
                        f"🚨 ¡PELIGRO EVITADO! El UUID {uuid_cp} tiene un monto de ${monto_actual}. NO ES UNA CARTA PORTE DE $1.12. ¡Cancelación abortada para proteger la factura real!"
                    )
                    writer.writerow(
                        [
                            uuid_cp,
                            uuid_sustituto,
                            "BLOQUEO_SEGURIDAD",
                            f"El monto era ${monto_actual}, no 1.12",
                        ]
                    )
                    continue
                # =======================================================================

                # Si llegamos aquí, ES SEGURO CANCELAR (El monto es 1.12)
                cadena = f"{uuid_cp}|01|{uuid_sustituto}"
                logger.info(f"✅ Monto validado ($1.12). 🚀 Enviando al SAT: {cadena}")

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

                        # Re-consultamos para estar 100% seguros de tener la instancia fresca en SQLAlchemy
                        documento = (
                            db.query(ReceivableInvoice)
                            .filter(ReceivableInvoice.uuid == uuid_puro_busqueda)
                            .first()
                        )

                        if documento:
                            if (
                                "error" in msg_res
                                or "no cancelable" in msg_res
                                or "rechaz" in msg_res
                                or st_res in ["500", "621"]
                            ):
                                documento.status_sat = "ERROR_CANCELACION"
                                documento.estatus = "pendiente"
                                documento.saldo_pendiente = float(
                                    documento.monto_total or 0
                                )

                                documento.detalle_sat = (
                                    f"Rechazo/Error SAT ({st_res}): {msg_res}"
                                )
                                logger.error(f"   ❌ Rechazo/Error guardado en BD.")

                            elif st_res == "201" or "proceso" in msg_res:
                                documento.status_sat = "PROCESO_CANCELACION"
                                documento.detalle_sat = (
                                    f"En proceso ante el SAT: {msg_res}"
                                )
                                documento.fecha_cancelacion = datetime.utcnow()
                                logger.info(f"   ⏳ En proceso guardado en BD.")

                            elif (
                                st_res == "202"
                                or "previamente cancelado" in msg_res
                                or "ya se encuentra cancelado" in msg_res
                                or (st_res == "200" and "exito" in msg_res)
                            ):
                                documento.status_sat = "CANCELADO"
                                documento.estatus = "cancelado"
                                documento.saldo_pendiente = 0.0

                                documento.detalle_sat = (
                                    f"Cancelación confirmada: {msg_res}"
                                )
                                documento.fecha_cancelacion = datetime.utcnow()
                                logger.info(f"   ✅ Éxito guardado en BD.")
                            else:
                                documento.detalle_sat = (
                                    f"Respuesta SAT ({st_res}): {msg_res}"
                                )

                            db.commit()
                        else:
                            logger.warning(
                                f"   ⚠️ UUID {uuid_puro_busqueda} no encontrado en la BD para actualizar estatus."
                            )

                        writer.writerow([u_res, uuid_sustituto, st_res, msg_res])
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
