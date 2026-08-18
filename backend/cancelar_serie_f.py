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
        "uuid": "59121418-2E30-4EC1-BB79-80F276C4D4C9",
        "motivo": "01",
        "sustitucion": "64618668-7081-4393-B0CF-B2A315FDE55C",
    },  # CP-18507 sustituida por CP-18509 (Monto Real: 34720.0)
    {
        "uuid": "858CD9B6-DDF4-499F-89F7-8BDDAC12656B",
        "motivo": "01",
        "sustitucion": "064EFE17-9D7B-4663-A363-5B5E4B31D759",
    },  # CP-18452 sustituida por CP-18496 (Monto Real: 31920.0)
    {
        "uuid": "1EEC0FB5-46F5-4CC3-A2A0-55B0553FC93A",
        "motivo": "01",
        "sustitucion": "AFA23537-AD71-49E1-AEC6-213CCB8AF710",
    },  # CP-18408 sustituida por CP-18494 (Monto Real: 77280.0)
    {
        "uuid": "15D9B3A6-7168-4617-9036-2AF4D058DF6F",
        "motivo": "01",
        "sustitucion": "BA649412-CAC7-42C7-B27B-D51B53F5148D",
    },  # CP-18469 sustituida por CP-18548 (Monto Real: 69888.0)
    {
        "uuid": "23374FC6-2E71-446C-B936-FE2405459522",
        "motivo": "01",
        "sustitucion": "BA649412-CAC7-42C7-B27B-D51B53F5148D",
    },  # CP-18513 sustituida por CP-18548 (Monto Real: 69888.0)
    {
        "uuid": "9B788A26-B182-47D2-95A2-F86324F53963",
        "motivo": "01",
        "sustitucion": "849D3757-63B1-4527-8E7D-62A54DFAF452",
    },  # CP-18566 sustituida por CP-18568 (Monto Real: 60480.0)
    {
        "uuid": "D06E604D-5B38-4F50-B568-D1EE7ED8D418",
        "motivo": "01",
        "sustitucion": "849D3757-63B1-4527-8E7D-62A54DFAF452",
    },  # CP-18567 sustituida por CP-18568 (Monto Real: 60480.0)
    {
        "uuid": "74B4F5C5-FCA9-41FB-823B-93FE0B992E7C",
        "motivo": "01",
        "sustitucion": "849D3757-63B1-4527-8E7D-62A54DFAF452",
    },  # CP-18441 sustituida por CP-18568 (Monto Real: 60480.0)
    {
        "uuid": "9C8D3C47-D76D-4C10-AA16-D124EA49197A",
        "motivo": "01",
        "sustitucion": "849D3757-63B1-4527-8E7D-62A54DFAF452",
    },  # CP-18442 sustituida por CP-18568 (Monto Real: 60480.0)
    {
        "uuid": "83399CF6-E7C1-42C3-B642-2820B513FDB0",
        "motivo": "01",
        "sustitucion": "A0E4A0D7-3B73-42CD-9888-10D3EA04D325",
    },  # CP-18454 sustituida por CP-18500 (Monto Real: 44800.0)
    {
        "uuid": "123F30B7-404D-45BE-B60B-597518CCEF4A",
        "motivo": "01",
        "sustitucion": "170645FF-FB9F-438F-BE61-B66B15B20121",
    },  # CP-18426 sustituida por CP-18501 (Monto Real: 35952.0)
    {
        "uuid": "4A793986-91D3-4E9B-868A-123A3F25AA4B",
        "motivo": "01",
        "sustitucion": "003F616F-A23E-4569-A4AA-1C3B7DFD0CDB",
    },  # CP-18477 sustituida por CP-18563 (Monto Real: 35952.0)
    {
        "uuid": "555AA63C-4F95-476D-8AFC-A2284ADE37E6",
        "motivo": "01",
        "sustitucion": "003F616F-A23E-4569-A4AA-1C3B7DFD0CDB",
    },  # CP-18451 sustituida por CP-18563 (Monto Real: 35952.0)
    {
        "uuid": "FB29F32E-DE9F-4887-B844-58434BC65483",
        "motivo": "01",
        "sustitucion": "003F616F-A23E-4569-A4AA-1C3B7DFD0CDB",
    },  # CP-18476 sustituida por CP-18563 (Monto Real: 35952.0)
    {
        "uuid": "42EE00A4-7237-4315-8FF0-B76B001E98EB",
        "motivo": "01",
        "sustitucion": "B1199239-8BFF-424F-9BD7-80B9107CC943",
    },  # CP-18417 sustituida por CP-18429 (Monto Real: 44800.0)
    {
        "uuid": "8AF8EDD4-557D-459E-B19C-DBA98708BD06",
        "motivo": "01",
        "sustitucion": "9F2302FE-B5AE-4071-B505-227F3EEAC440",
    },  # CP-18456 sustituida por CP-18490 (Monto Real: 56000.0)
    {
        "uuid": "50C7C0A8-3E89-425B-B1AB-196BD5CFA006",
        "motivo": "01",
        "sustitucion": "9F2302FE-B5AE-4071-B505-227F3EEAC440",
    },  # CP-18482 sustituida por CP-18490 (Monto Real: 56000.0)
    {
        "uuid": "34C8D7F2-B8FA-4B1D-BC6B-7F9D16B18862",
        "motivo": "01",
        "sustitucion": "10718765-8E07-45CE-91E1-20B0E1EFFA70",
    },  # CP-18434 sustituida por CP-18488 (Monto Real: 56000.0)
    {
        "uuid": "78C4094E-9092-4BCD-8453-E75C71E4DAF6",
        "motivo": "01",
        "sustitucion": "10718765-8E07-45CE-91E1-20B0E1EFFA70",
    },  # CP-18478 sustituida por CP-18488 (Monto Real: 56000.0)
    {
        "uuid": "8191BAD1-F6E2-47A4-B5E9-B1238B852394",
        "motivo": "01",
        "sustitucion": "10718765-8E07-45CE-91E1-20B0E1EFFA70",
    },  # CP-18448 sustituida por CP-18488 (Monto Real: 56000.0)
    {
        "uuid": "17CFE298-59CC-41F4-AB30-5E425859DEDB",
        "motivo": "01",
        "sustitucion": "CD82FC57-1653-4FF4-86CD-F60EF629C88C",
    },  # CP-18479 sustituida por CP-18487 (Monto Real: 56000.0)
    {
        "uuid": "C8AD46CC-A6F9-4613-B297-6AE32383D9A7",
        "motivo": "01",
        "sustitucion": "312DC507-652D-4534-977C-20E6CA05FA8D",
    },  # CP-18497 sustituida por CP-18545 (Monto Real: 69888.0)
    {
        "uuid": "3734AE63-4F5F-4551-91DD-B27A83E7815F",
        "motivo": "01",
        "sustitucion": "9924F214-01D3-4E7E-9057-6F2F7DFB0BC7",
    },  # CP-18549 sustituida por CP-18551 (Monto Real: 38080.0)
    {
        "uuid": "831223C3-B209-4E8B-B442-F091FD4ABF9F",
        "motivo": "01",
        "sustitucion": "6E9EF9CA-B338-4DFA-80AE-0B07980BFA17",
    },  # CP-18462 sustituida por CP-18492 (Monto Real: 37467.36)
    {
        "uuid": "ED6BFDF0-CE8E-4CD0-97C5-26E9F39F8A9D",
        "motivo": "01",
        "sustitucion": "6E9EF9CA-B338-4DFA-80AE-0B07980BFA17",
    },  # CP-18425 sustituida por CP-18492 (Monto Real: 37467.36)
    {
        "uuid": "886CBF5C-C28B-4430-BA3C-2019CA140419",
        "motivo": "01",
        "sustitucion": "7596475C-EF40-45C4-BBC5-EF406147422C",
    },  # CP-18530 sustituida por CP-18558 (Monto Real: 50086.4)
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
