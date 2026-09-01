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
# 69 CARTAS PORTE "VIVAS" DE $1.12 - CANCELACIÓN MOTIVO 02 (SIN SUSTITUCIÓN)
# =====================================================================

UUIDS_REINTENTO = [
    {"uuid": "A3CD98E4-28F7-451B-A1C1-C6BE36B0FCCF", "motivo": "02"},
    {"uuid": "C94538BB-9197-4275-BA90-9143D04772B4", "motivo": "02"},
    {"uuid": "EE4687D3-764E-4C7F-B520-2BEB33671A19", "motivo": "02"},
    {"uuid": "64DB3F21-521E-4DF2-880B-8022928B8601", "motivo": "02"},
    {"uuid": "F53E65C1-8CA4-4740-A743-6876339A39A0", "motivo": "02"},
    {"uuid": "27D0894B-20D4-44CE-B789-C882246A2289", "motivo": "02"},
    {"uuid": "667A2E01-757E-4A8E-A325-1E26E330FFEE", "motivo": "02"},
    {"uuid": "BB5390FC-EBE3-413E-8CCE-EF71D41F488E", "motivo": "02"},
    {"uuid": "95AFCE1E-B52E-48C0-98C4-5630B8297F63", "motivo": "02"},
    {"uuid": "AD38D0C5-0B87-4196-9408-D1B5925771A6", "motivo": "02"},
    {"uuid": "A4709318-2BA7-4F6C-BD50-185645459170", "motivo": "02"},
    {"uuid": "1A93E572-F4A3-466B-8A5A-1DF61B317593", "motivo": "02"},
    {"uuid": "C7170B0A-93A8-4C6B-B20A-3423FE519683", "motivo": "02"},
    {"uuid": "474EA661-F412-4841-BDE0-49B78607F743", "motivo": "02"},
]


def disparar_cancelacion_sat():
    logger.info(
        f"Iniciando proceso de cancelación Motivo 02 para {len(UUIDS_A_CANCELAR)} UUIDs..."
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_cancelacion_motivo02_{timestamp}.csv"

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

                # =======================================================================
                # 🛡️ BLOQUEO DE SEGURIDAD EXTREMO: Validar que el monto sea STRICTAMENTE $1.12
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
                            motivo,
                            "ERROR_SEGURIDAD",
                            "UUID no existe en BD local",
                        ]
                    )
                    continue

                # Redondeo estricto a 2 decimales
                monto_actual = round(float(documento_seguridad.monto_total or 0.0), 2)

                # Bloqueo total si el monto NO es exactamente 1.12
                if monto_actual != 1.12:
                    logger.error(
                        f"🚨 ¡PELIGRO EVITADO! El UUID {uuid_cp} tiene un monto de ${monto_actual:,.2f}. "
                        f"¡NO ES UNA CARTA PORTE DE $1.12! Cancelación ABORTADA para proteger la factura real."
                    )
                    writer.writerow(
                        [
                            uuid_cp,
                            motivo,
                            "BLOQUEO_SEGURIDAD",
                            f"El monto era ${monto_actual:,.2f}, no $1.12",
                        ]
                    )
                    continue
                # =======================================================================

                # Cadena para Motivo 02 (Formato SAT: UUID|02|)
                cadena = f"{uuid_cp}|02|"
                logger.info(
                    f"✅ Monto verificado ($1.12). 🚀 Enviando al SAT: {cadena}"
                )

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
                                f"   ⚠️ UUID {uuid_puro_busqueda} no encontrado en la BD."
                            )

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
