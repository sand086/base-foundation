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
    {
        "uuid": "C5B59282-2FEB-4FF6-AA4D-A9B639969E25",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18498 - Monto Validado: 1.12
    {
        "uuid": "3ECA0281-F268-46E8-8B38-5B9D022B8C05",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18455 - Monto Validado: 1.12
    {
        "uuid": "F52C4371-F914-4DE3-B542-E2DD7DBCEF7C",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18531 - Monto Validado: 1.12
    {
        "uuid": "25EB7F9D-D25E-40F8-9883-6FD8622AB3B5",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18475 - Monto Validado: 1.12
    {
        "uuid": "DC447689-049A-4CBC-8CB3-879EBDDCCF60",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18510 - Monto Validado: 1.12
    {
        "uuid": "8F155448-2BB5-4941-8396-FD896E5D68B3",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18511 - Monto Validado: 1.12
    {
        "uuid": "AE37A32A-059E-42CF-A4FA-76B069A94E3A",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18471 - Monto Validado: 1.12
    {
        "uuid": "FCECF6B6-0170-4070-84FE-20258395FFE4",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18449 - Monto Validado: 1.12
    {
        "uuid": "CDF77E2F-654A-4E33-B288-F1D132224E67",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18512 - Monto Validado: 1.12
    {
        "uuid": "309B97B7-59B8-4E25-B451-3217B24A30BE",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18553 - Monto Validado: 1.12
    {
        "uuid": "68B12A1A-9F9D-45FE-A2BA-1BA8BF007D38",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18464 - Monto Validado: 1.12
    {
        "uuid": "4FF09221-1796-4AE8-A19C-18EF1CED4493",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18532 - Monto Validado: 1.12
    {
        "uuid": "EB9DE2E5-23AC-4C9A-978F-BEC292235E91",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18556 - Monto Validado: 1.12
    {
        "uuid": "8AEE0325-D35A-4698-A53D-728EF6D90D0E",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18499 - Monto Validado: 1.12
    {
        "uuid": "A102FEA4-A016-43C9-B4FC-33D9F57F4CD5",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18472 - Monto Validado: 1.12
    {
        "uuid": "57CEB7A8-874F-432A-AF55-4A6506B0B356",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18484 - Monto Validado: 1.12
    {
        "uuid": "351F3816-D3F1-46A3-8F74-1052801A6AD1",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18504 - Monto Validado: 1.12
    {
        "uuid": "597AD592-7F08-43A8-8CBF-84F399BCA043",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18446 - Monto Validado: 1.12
    {
        "uuid": "81FC2FF6-47C4-4E0F-8004-63919AE374A0",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18435 - Monto Validado: 1.12
    {
        "uuid": "19C207DE-43C7-49CB-8DCF-B2433F8B00A0",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18439 - Monto Validado: 1.12
    {
        "uuid": "ABAF5260-AFEE-435C-B81C-41C62E237854",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18447 - Monto Validado: 1.12
    {
        "uuid": "CB752187-7E8D-44D5-8321-B79C143DFFA4",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18419 - Monto Validado: 1.12
    {
        "uuid": "C46B5F0E-DB7A-4246-8B00-9A98F6F02E16",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18436 - Monto Validado: 1.12
    {
        "uuid": "84984B8D-DCF7-45AC-B50F-0696ECE36C25",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18422 - Monto Validado: 1.12
    {
        "uuid": "2BD84D94-E321-4A79-B63B-8F79A5E9339E",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18424 - Monto Validado: 1.12
    {
        "uuid": "4B1B065F-1863-480E-BE4D-12C24C83E1F1",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18437 - Monto Validado: 1.12
    {
        "uuid": "383DFFA4-3747-468A-B135-3806654EA03D",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18407 - Monto Validado: 1.12
    {
        "uuid": "ED6BFDF0-CE8E-4CD0-97C5-26E9F39F8A9D",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18425 - Monto Validado: 1.12
    {
        "uuid": "0007CB11-8AC9-40D6-9302-4FC4F047BAEB",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18453 - Monto Validado: 1.12
    {
        "uuid": "0B44F0E3-CD9A-4610-95E7-55FC2BFD01BD",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18438 - Monto Validado: 1.12
    {
        "uuid": "858CD9B6-DDF4-499F-89F7-8BDDAC12656B",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18452 - Monto Validado: 1.12
    {
        "uuid": "34C8D7F2-B8FA-4B1D-BC6B-7F9D16B18862",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18434 - Monto Validado: 1.12
    {
        "uuid": "59121418-2E30-4EC1-BB79-80F276C4D4C9",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18507 - Monto Validado: 1.12
    {
        "uuid": "1EEC0FB5-46F5-4CC3-A2A0-55B0553FC93A",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18408 - Monto Validado: 1.12
    {
        "uuid": "AA2DFFBF-A35E-48A9-B5C1-85709939040D",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18537 - Monto Validado: 1.12
    {
        "uuid": "42EE00A4-7237-4315-8FF0-B76B001E98EB",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18417 - Monto Validado: 1.12
    {
        "uuid": "8AF8EDD4-557D-459E-B19C-DBA98708BD06",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18456 - Monto Validado: 1.12
    {
        "uuid": "8191BAD1-F6E2-47A4-B5E9-B1238B852394",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18448 - Monto Validado: 1.12
    {
        "uuid": "78C4094E-9092-4BCD-8453-E75C71E4DAF6",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18478 - Monto Validado: 1.12
    {
        "uuid": "3B79B520-48DF-4980-B126-4A9F6004D767",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18538 - Monto Validado: 1.12
    {
        "uuid": "50C7C0A8-3E89-425B-B1AB-196BD5CFA006",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18482 - Monto Validado: 1.12
    {
        "uuid": "83399CF6-E7C1-42C3-B642-2820B513FDB0",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18454 - Monto Validado: 1.12
    {
        "uuid": "123F30B7-404D-45BE-B60B-597518CCEF4A",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18426 - Monto Validado: 1.12
    {
        "uuid": "17CFE298-59CC-41F4-AB30-5E425859DEDB",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18479 - Monto Validado: 1.12
    {
        "uuid": "0E05A6B6-CE1B-44E0-98A1-D6FA14E636B5",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18554 - Monto Validado: 1.12
    {
        "uuid": "05BC2305-F01F-4487-8527-52286D3EACA9",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18421 - Monto Validado: 1.12
    {
        "uuid": "15D9B3A6-7168-4617-9036-2AF4D058DF6F",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18469 - Monto Validado: 1.12
    {
        "uuid": "DCD1C7FD-7E35-4510-A11E-AB5118B3F093",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18514 - Monto Validado: 1.12
    {
        "uuid": "23374FC6-2E71-446C-B936-FE2405459522",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18513 - Monto Validado: 1.12
    {
        "uuid": "4B522F76-90E8-42EE-86CC-1D67B4134DE8",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18505 - Monto Validado: 1.12
    {
        "uuid": "C8AD46CC-A6F9-4613-B297-6AE32383D9A7",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18497 - Monto Validado: 1.12
    {
        "uuid": "3734AE63-4F5F-4551-91DD-B27A83E7815F",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18549 - Monto Validado: 1.12
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
