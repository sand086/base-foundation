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
#  69 CARTAS PORTE "VIVAS" DE $1.12 - CANCELACIÓN MOTIVO 02
# =====================================================================

UUIDS_A_CANCELAR = [
    {"uuid": "474EA661-F412-4841-BDE0-49B78607F743", "motivo": "02", "sustitucion": ""},
    {"uuid": "6BB19C9F-1CFB-4FA2-AB6C-5F1E6F278D1D", "motivo": "02", "sustitucion": ""},
    {"uuid": "4389AF82-4EA2-4193-B82E-0333334EB097", "motivo": "02", "sustitucion": ""},
    {"uuid": "8843EE5D-E7B8-44E8-9AAC-CAB1D12A9690", "motivo": "02", "sustitucion": ""},
    {"uuid": "C7170B0A-93A8-4C6B-B20A-3423FE519683", "motivo": "02", "sustitucion": ""},
    {"uuid": "B7CA9208-66BF-4E0E-889A-D10259FEE00D", "motivo": "02", "sustitucion": ""},
    {"uuid": "26AF2BAA-E4AD-4506-866F-0270A0C04BFA", "motivo": "02", "sustitucion": ""},
    {"uuid": "D689254C-64C7-4458-83EB-C544A9378F17", "motivo": "02", "sustitucion": ""},
    {"uuid": "1A93E572-F4A3-466B-8A5A-1DF61B317593", "motivo": "02", "sustitucion": ""},
    {"uuid": "4C307989-A4AC-4FD2-981E-EF4C2644E512", "motivo": "02", "sustitucion": ""},
    {"uuid": "4BB6BF0B-4587-41C3-B477-C2D3902D25CD", "motivo": "02", "sustitucion": ""},
    {"uuid": "1379810F-E508-4E7A-9947-3B7819B16456", "motivo": "02", "sustitucion": ""},
    {"uuid": "0B0DA9E8-A770-4216-BA75-EC4EA0262419", "motivo": "02", "sustitucion": ""},
    {"uuid": "0DAA9850-2C3D-4102-AF8D-6A4D54BFA984", "motivo": "02", "sustitucion": ""},
    {"uuid": "DE0A3A8B-D733-4F3F-8FE7-DA9260B360B7", "motivo": "02", "sustitucion": ""},
    {"uuid": "8418E279-14CE-45EC-A3D9-2D656DA48939", "motivo": "02", "sustitucion": ""},
    {"uuid": "59D07D5E-42A2-4B92-AFCF-3D34E4D0778B", "motivo": "02", "sustitucion": ""},
    {"uuid": "A4709318-2BA7-4F6C-BD50-185645459170", "motivo": "02", "sustitucion": ""},
    {"uuid": "AD38D0C5-0B87-4196-9408-D1B5925771A6", "motivo": "02", "sustitucion": ""},
    {"uuid": "2256E7BF-1A9F-4B4E-91E1-9B5D8EDAF3D9", "motivo": "02", "sustitucion": ""},
    {"uuid": "6D20F5C8-3367-4074-8572-FC69B846F989", "motivo": "02", "sustitucion": ""},
    {"uuid": "3A09CDAD-727E-4890-A0A6-05D584503843", "motivo": "02", "sustitucion": ""},
    {"uuid": "2E057E6A-D87D-469B-AD79-45F0623F1431", "motivo": "02", "sustitucion": ""},
    {"uuid": "61E38FEF-3D2B-4FE7-A751-37F7DABECCF7", "motivo": "02", "sustitucion": ""},
    {"uuid": "95AFCE1E-B52E-48C0-98C4-5630B8297F63", "motivo": "02", "sustitucion": ""},
    {"uuid": "279D1FF3-0604-4786-B0ED-99A74B6D2FFC", "motivo": "02", "sustitucion": ""},
    {"uuid": "59175388-39E3-49E8-AE3D-8877C1ABB08B", "motivo": "02", "sustitucion": ""},
    {"uuid": "8EA92F24-D051-486E-A74D-8916F82A533E", "motivo": "02", "sustitucion": ""},
    {"uuid": "E53A2FA6-29C1-4B5D-B31B-F7C5CDBFC51F", "motivo": "02", "sustitucion": ""},
    {"uuid": "4C22E000-EE8D-43FA-8735-F21B06E218DD", "motivo": "02", "sustitucion": ""},
    {"uuid": "BB5390FC-EBE3-413E-8CCE-EF71D41F488E", "motivo": "02", "sustitucion": ""},
    {"uuid": "EAD43EAF-A4F2-48BC-B254-27FC4822585B", "motivo": "02", "sustitucion": ""},
    {"uuid": "667A2E01-757E-4A8E-A325-1E26E330FFEE", "motivo": "02", "sustitucion": ""},
    {"uuid": "8A8E9215-A353-45FF-BFC7-A26353A43258", "motivo": "02", "sustitucion": ""},
    {"uuid": "5685247F-A412-4F21-9742-85F29D903D28", "motivo": "02", "sustitucion": ""},
    {"uuid": "AFD869B7-530F-498C-B0FB-8D670BC80590", "motivo": "02", "sustitucion": ""},
    {"uuid": "3B8622B9-8C49-43C8-94B7-D05BF2075FAF", "motivo": "02", "sustitucion": ""},
    {"uuid": "193CD0F2-2331-4B7F-A47B-6B776CBC0CFD", "motivo": "02", "sustitucion": ""},
    {"uuid": "1CD5E11B-FB52-47F8-99DF-C2C10954084A", "motivo": "02", "sustitucion": ""},
    {"uuid": "E6F6EADC-D7CC-430B-B673-92F19835E468", "motivo": "02", "sustitucion": ""},
    {"uuid": "2C1DCEA5-F3A2-4564-89C0-AB85286F9219", "motivo": "02", "sustitucion": ""},
    {"uuid": "6EE54714-C24D-48AA-8F9A-73EF68035B64", "motivo": "02", "sustitucion": ""},
    {"uuid": "BEDA54C0-E90C-4E39-83B6-8D512E8D1A1F", "motivo": "02", "sustitucion": ""},
    {"uuid": "27D0894B-20D4-44CE-B789-C882246A2289", "motivo": "02", "sustitucion": ""},
    {"uuid": "B46969A8-100E-46BD-A6D8-742444E27D1C", "motivo": "02", "sustitucion": ""},
    {"uuid": "F53E65C1-8CA4-4740-A743-6876339A39A0", "motivo": "02", "sustitucion": ""},
    {"uuid": "957242F5-1C19-4343-91D7-1CC06BE852B7", "motivo": "02", "sustitucion": ""},
    {"uuid": "D326FA68-8C1C-4019-8632-4FA8DDA3895D", "motivo": "02", "sustitucion": ""},
    {"uuid": "64DB3F21-521E-4DF2-880B-8022928B8601", "motivo": "02", "sustitucion": ""},
    {"uuid": "9A526F7C-A644-4D67-937A-4D5067C384C5", "motivo": "02", "sustitucion": ""},
    {"uuid": "EB1B4374-AFC5-46ED-B3DB-8C245DA91A7C", "motivo": "02", "sustitucion": ""},
    {"uuid": "D849851B-F1DC-4A18-A9F1-7ED74878DF70", "motivo": "02", "sustitucion": ""},
    {"uuid": "4841A9C1-C3F7-45C7-909B-D2E6E132C5DE", "motivo": "02", "sustitucion": ""},
    {"uuid": "CE09CD2A-BAAE-4816-82A4-2F38AFF9373D", "motivo": "02", "sustitucion": ""},
    {"uuid": "AC08167D-9EFB-4944-80DB-027484027234", "motivo": "02", "sustitucion": ""},
    {"uuid": "D6BF1D24-E207-4F45-8027-23E3D3DB06D9", "motivo": "02", "sustitucion": ""},
    {"uuid": "86F8534F-FFE8-45D2-9C94-F67EAC06C159", "motivo": "02", "sustitucion": ""},
    {"uuid": "3C922F51-13DC-4844-8B52-16F4466D5B70", "motivo": "02", "sustitucion": ""},
    {"uuid": "8A53A2BA-23FE-4667-B2A2-F0064109DB9F", "motivo": "02", "sustitucion": ""},
    {"uuid": "861FEFF4-EF41-4B85-9D30-5B3F7ECF7DE0", "motivo": "02", "sustitucion": ""},
    {"uuid": "3F81B264-D314-4FDA-B9C3-D31A7C76A92F", "motivo": "02", "sustitucion": ""},
    {"uuid": "EE4687D3-764E-4C7F-B520-2BEB33671A19", "motivo": "02", "sustitucion": ""},
    {"uuid": "CFB6A1A2-A9BD-48A2-A157-47A6EEF09923", "motivo": "02", "sustitucion": ""},
    {"uuid": "C94538BB-9197-4275-BA90-9143D04772B4", "motivo": "02", "sustitucion": ""},
    {"uuid": "00335110-AE01-432F-924F-E9D3B00EB7EE", "motivo": "02", "sustitucion": ""},
    {"uuid": "10F7EE6A-EBA0-45FE-948F-1944C120862F", "motivo": "02", "sustitucion": ""},
    {"uuid": "A3CD98E4-28F7-451B-A1C1-C6BE36B0FCCF", "motivo": "02", "sustitucion": ""},
    {"uuid": "29AC565C-015D-47D3-ADF1-11DC123E1B33", "motivo": "02", "sustitucion": ""},
    {"uuid": "C288FB0B-6E78-4C68-A53F-1AB9A18EFE1B", "motivo": "02", "sustitucion": ""},
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
