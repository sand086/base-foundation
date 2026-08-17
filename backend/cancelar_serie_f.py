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
logger = logging.getLogger("cancelacion_forzada")

# =====================================================================
#  MAPEO: PRIMERO LOS HIJOS (PAGOS Y SUSTITUTAS), LUEGO LA CARTA PORTE
# =====================================================================

UUIDS_A_CANCELAR = [
    {"uuid": "C5B59282-2FEB-4FF6-AA4D-A9B639969E25", "motivo": "02", "sustitucion": ""},
    {"uuid": "8F155448-2BB5-4941-8396-FD896E5D68B3", "motivo": "02", "sustitucion": ""},
    {"uuid": "597AD592-7F08-43A8-8CBF-84F399BCA043", "motivo": "02", "sustitucion": ""},
    {"uuid": "C46B5F0E-DB7A-4246-8B00-9A98F6F02E16", "motivo": "02", "sustitucion": ""},
    {"uuid": "0007CB11-8AC9-40D6-9302-4FC4F047BAEB", "motivo": "02", "sustitucion": ""},
    {"uuid": "1EEC0FB5-46F5-4CC3-A2A0-55B0553FC93A", "motivo": "02", "sustitucion": ""},
    {"uuid": "AA2DFFBF-A35E-48A9-B5C1-85709939040D", "motivo": "02", "sustitucion": ""},
    {"uuid": "42EE00A4-7237-4315-8FF0-B76B001E98EB", "motivo": "02", "sustitucion": ""},
    {"uuid": "8AF8EDD4-557D-459E-B19C-DBA98708BD06", "motivo": "02", "sustitucion": ""},
    {"uuid": "8191BAD1-F6E2-47A4-B5E9-B1238B852394", "motivo": "02", "sustitucion": ""},
    {"uuid": "78C4094E-9092-4BCD-8453-E75C71E4DAF6", "motivo": "02", "sustitucion": ""},
    {"uuid": "50C7C0A8-3E89-425B-B1AB-196BD5CFA006", "motivo": "02", "sustitucion": ""},
    {"uuid": "83399CF6-E7C1-42C3-B642-2820B513FDB0", "motivo": "02", "sustitucion": ""},
    {"uuid": "123F30B7-404D-45BE-B60B-597518CCEF4A", "motivo": "02", "sustitucion": ""},
    {"uuid": "17CFE298-59CC-41F4-AB30-5E425859DEDB", "motivo": "02", "sustitucion": ""},
    {"uuid": "0E05A6B6-CE1B-44E0-98A1-D6FA14E636B5", "motivo": "02", "sustitucion": ""},
    {"uuid": "05BC2305-F01F-4487-8527-52286D3EACA9", "motivo": "02", "sustitucion": ""},
    {"uuid": "DCD1C7FD-7E35-4510-A11E-AB5118B3F093", "motivo": "02", "sustitucion": ""},
    {"uuid": "23374FC6-2E71-446C-B936-FE2405459522", "motivo": "02", "sustitucion": ""},
    {"uuid": "4B522F76-90E8-42EE-86CC-1D67B4134DE8", "motivo": "02", "sustitucion": ""},
    {"uuid": "C8AD46CC-A6F9-4613-B297-6AE32383D9A7", "motivo": "02", "sustitucion": ""},
    {"uuid": "3734AE63-4F5F-4551-91DD-B27A83E7815F", "motivo": "02", "sustitucion": ""},
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

        # ✅ LÍNEA CORREGIDA
        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(["UUID", "Status_SAT", "Mensaje_SAT"])

            for item in UUIDS_A_CANCELAR:
                if item["sustitucion"]:
                    cadena = f"{item['uuid']}|{item['motivo']}|{item['sustitucion']}"
                else:
                    cadena = f"{item['uuid']}|{item['motivo']}"

                logger.info(f"🚀 Enviando al SAT: {cadena}")

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
                        u_res = str(getattr(res, "uuid", item["uuid"])).strip().upper()
                        st_res = str(getattr(res, "status", "Sin Status"))
                        msg_res = str(getattr(res, "mensaje", "Sin Mensaje")).lower()

                        logger.info(
                            f"   SAT Respondió -> Código: {st_res} | Mensaje: {msg_res}"
                        )

                        uuid_puro_busqueda = u_res.split("|")[0].strip()

                        # ------------------------------------------------------------------
                        # 🕵️‍♂️ BÚSQUEDA INTELIGENTE EN BD (Busca en facturas y si no, en pagos)
                        # ------------------------------------------------------------------
                        es_pago = False
                        documento = (
                            db.query(ReceivableInvoice)
                            .filter(ReceivableInvoice.uuid == uuid_puro_busqueda)
                            .first()
                        )

                        if not documento:
                            documento = (
                                db.query(ReceivableInvoicePayment)
                                .filter(
                                    ReceivableInvoicePayment.complemento_uuid
                                    == uuid_puro_busqueda
                                )
                                .first()
                            )
                            es_pago = True

                        if documento:
                            if (
                                "error" in msg_res
                                or "no cancelable" in msg_res
                                or "rechaz" in msg_res
                                or st_res in ["500", "621"]
                            ):
                                if es_pago:
                                    documento.estatus = "ACTIVO"
                                else:
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
                                if es_pago:
                                    documento.estatus = "PROCESO_CANCELACION"
                                else:
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
                                if es_pago:
                                    documento.estatus = "CANCELADO"
                                else:
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
                                f"   ⚠️ UUID {uuid_puro_busqueda} no encontrado ni en Facturas ni en Pagos en la BD."
                            )

                        writer.writerow([u_res, st_res, msg_res])
                    else:
                        logger.warning(
                            f"   ⚠️ El PAC no devolvió desglose para {item['uuid']}"
                        )

                except Exception as e_indiv:
                    logger.error(f"   ❌ Error al procesar {item['uuid']}: {e_indiv}")

        logger.info(f"📁 Evidencia guardada en: {csv_filename}")

    except Exception as e_general:
        logger.error(f"❌ Error fatal: {e_general}")
    finally:
        db.close()
        logger.info("Proceso terminado.")


if __name__ == "__main__":
    disparar_cancelacion_sat()
