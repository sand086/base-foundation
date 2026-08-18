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
        "uuid": "831223C3-B209-4E8B-B442-F091FD4ABF9F",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18462
    {
        "uuid": "74B4F5C5-FCA9-41FB-823B-93FE0B992E7C",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18441
    {
        "uuid": "9C8D3C47-D76D-4C10-AA16-D124EA49197A",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18442
    {
        "uuid": "9B788A26-B182-47D2-95A2-F86324F53963",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18566
    {
        "uuid": "D06E604D-5B38-4F50-B568-D1EE7ED8D418",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18567
    {
        "uuid": "555AA63C-4F95-476D-8AFC-A2284ADE37E6",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18451
    {
        "uuid": "FB29F32E-DE9F-4887-B844-58434BC65483",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18476
    {
        "uuid": "4A793986-91D3-4E9B-868A-123A3F25AA4B",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18477
    {
        "uuid": "886CBF5C-C28B-4430-BA3C-2019CA140419",
        "motivo": "02",
        "sustitucion": "",
    },  # CP-18530
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
