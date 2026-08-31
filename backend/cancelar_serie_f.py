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
        "uuid": "2F6ED70C-80E8-4DAD-BADB-8CC4984EE794",
        "motivo": "01",
        "sustitucion": "D01179A3-072C-4B6E-BA3C-FA7DBF671763",
    },
    {
        "uuid": "D6B7883E-D36C-4995-AD0B-665B1679E474",
        "motivo": "01",
        "sustitucion": "ECB77C26-1D79-424B-AE02-3F750943C5CC",
    },
    {
        "uuid": "08E712E0-BBCB-462C-A8E5-43AA931CF701",
        "motivo": "01",
        "sustitucion": "E286602C-962B-4953-9C62-833102BE24B9",
    },
    {
        "uuid": "6DAF6E51-5AC3-4145-A46E-07401D927D0F",
        "motivo": "01",
        "sustitucion": "6A906836-55E1-4AF4-973A-0AFAF8F11A2D",
    },
    {
        "uuid": "51E119E4-769D-4574-AE49-DDD1610AE25A",
        "motivo": "01",
        "sustitucion": "DFA950C9-C088-45ED-8277-CFA3596AECD4",
    },
    {
        "uuid": "FFDF4E15-59C4-4CC5-8198-3DA7EBD3F471",
        "motivo": "01",
        "sustitucion": "2BC3AA0F-08E5-47FB-B195-8922C429CCCA",
    },
    {
        "uuid": "AC3B4260-216E-4EF4-8C70-D8660190BED6",
        "motivo": "01",
        "sustitucion": "1E573B3D-0109-4456-A280-E98B97BF0589",
    },
    {
        "uuid": "D02009F3-24D6-48F3-9712-ECF8301B0A8E",
        "motivo": "01",
        "sustitucion": "B3B04BD3-3630-492C-95AF-5C6C86FBA4A9",
    },
    {
        "uuid": "44506A19-37C5-4211-9CE2-646F4F332087",
        "motivo": "01",
        "sustitucion": "B07D502B-2983-4DA9-885D-AB689A6B9633",
    },
    {
        "uuid": "464AA7B3-0B27-4537-BB2F-4CA174F620EF",
        "motivo": "01",
        "sustitucion": "1F52026B-D88E-47B2-9267-B893A3E2E33B",
    },
    {
        "uuid": "430A90D5-AE3E-469B-9473-3ABCA67CAB67",
        "motivo": "01",
        "sustitucion": "AC49B640-EF82-4343-838A-41E62226DFA8",
    },
    {
        "uuid": "2E72F4AD-49E3-4C72-BC3B-814CA6A23336",
        "motivo": "01",
        "sustitucion": "015954C1-F97B-4BD4-9DDF-B0E5E451180C",
    },
    {
        "uuid": "62C2494E-9D2F-42B6-BDFF-0780D8491A08",
        "motivo": "01",
        "sustitucion": "A00AEAC4-DBF6-4F9B-BD40-5F9161B75A4D",
    },
    {
        "uuid": "FDA94CE9-57DB-4DBA-9C39-8576E78106BE",
        "motivo": "01",
        "sustitucion": "2A92A512-C63D-4A93-8C29-478416471E70",
    },
    {
        "uuid": "71A6EB1E-72C3-47A9-95A9-A09D3142B007",
        "motivo": "01",
        "sustitucion": "F28483EB-53FF-440B-AC6D-35F60E8CCD01",
    },
    {
        "uuid": "48DAC70B-D391-489A-9E00-174D08EBF43F",
        "motivo": "01",
        "sustitucion": "919974C1-6C92-4333-B609-E910723F9C12",
    },
    {
        "uuid": "C0FD6DE5-94E9-4027-BE94-9E3E4C35EAF7",
        "motivo": "01",
        "sustitucion": "8B627482-98D7-4939-86C3-C9F93E89961E",
    },
    {
        "uuid": "4C87350C-281B-4240-A593-4D3FAB793963",
        "motivo": "01",
        "sustitucion": "84832C2A-70B0-40FE-A5A2-0EFF87FA43B6",
    },
    {
        "uuid": "BC6730F8-BCE0-4899-9287-95EF6E518AC2",
        "motivo": "01",
        "sustitucion": "4BC4EFAC-C3E8-4511-BE67-F1AE047D57CA",
    },
    {
        "uuid": "29C06154-EDBC-48E1-95E6-F0FA2C9B932A",
        "motivo": "01",
        "sustitucion": "2E607877-32DF-4FBD-AC30-00BE7F018809",
    },
    {
        "uuid": "05131D4C-CD40-4E93-BA39-99DBD343D4AB",
        "motivo": "01",
        "sustitucion": "56910BA8-A7FC-4774-AF53-7087064E36ED",
    },
    {
        "uuid": "7A498677-925A-47A2-BF48-7A8E0876A0FF",
        "motivo": "01",
        "sustitucion": "0990801B-A2B7-4C72-8A59-6A03F3A793BD",
    },
    {
        "uuid": "260F7CDD-EB4D-4561-A136-B21B23DE607E",
        "motivo": "01",
        "sustitucion": "AD8CA77A-BF64-4A14-9FFE-BCE40645E720",
    },
    {
        "uuid": "80222F04-CCF1-4CC1-B55B-987A7E096484",
        "motivo": "01",
        "sustitucion": "8934DE21-1257-42BD-8085-D3D2F0A94AE1",
    },
    {
        "uuid": "F3AC3CEA-F53F-481C-8D91-248C6873100F",
        "motivo": "01",
        "sustitucion": "E3DF1281-5618-41DF-BD0E-C5215B824CCC",
    },
    {
        "uuid": "5235A0C6-F353-42A9-802A-129BDC5AFBAF",
        "motivo": "01",
        "sustitucion": "D2C9A02B-D026-4EE9-8CD0-21A10757DF92",
    },
    {
        "uuid": "28B5F5B6-CB05-4C27-8CBE-39D5D4D804A5",
        "motivo": "01",
        "sustitucion": "19C5D27C-85FF-4806-A524-D4099A893970",
    },
    {
        "uuid": "1BB238CA-FFEC-4FE8-BC02-B5CCC75EFDF7",
        "motivo": "01",
        "sustitucion": "E8C76589-71C2-417B-92D3-4A00C4D5C649",
    },
    {
        "uuid": "612B1C05-7449-4715-A87E-C4B19B1F4AB7",
        "motivo": "01",
        "sustitucion": "9719024C-1641-42C4-91C9-728DCCFEC136",
    },
    {
        "uuid": "D9B71E95-5D88-48DD-8DEE-6323FAED0888",
        "motivo": "01",
        "sustitucion": "26DE2F5F-D553-4C75-84B1-C0986AB5CA52",
    },
    {
        "uuid": "080BA4BF-73DD-4B7A-B966-F78ECE02079F",
        "motivo": "01",
        "sustitucion": "9B83A911-234C-4179-BD83-CF17EE75BEE3",
    },
    {
        "uuid": "79AF9AB5-4A5A-4B0B-B7E2-7CC5798B2BE8",
        "motivo": "01",
        "sustitucion": "1E535649-7B6A-45F6-9F2B-6C697261337C",
    },
    {
        "uuid": "63FEF86F-1EAE-46BC-A1C1-0CD14ABAE4D9",
        "motivo": "01",
        "sustitucion": "DF280E49-BAB0-42A0-873B-BD82CB9D6198",
    },
    {
        "uuid": "65EED69B-B899-4C8D-A36B-B04AF11C5A8A",
        "motivo": "01",
        "sustitucion": "E95BB55C-2ADC-4EC0-8F4F-B991603012B2",
    },
    {
        "uuid": "EC0172BF-2F22-425F-B43C-24E85E8F4551",
        "motivo": "01",
        "sustitucion": "4D00998B-D97F-4173-ADA9-256EA52320C2",
    },
    {
        "uuid": "D3C941CC-F0DD-4066-A70D-1D8F002B5E0B",
        "motivo": "01",
        "sustitucion": "088444F3-D030-4183-B77D-44A23DC32C9E",
    },
    {
        "uuid": "EF837C08-F9A0-47EC-BBA9-F001AE83D829",
        "motivo": "01",
        "sustitucion": "10C5F0F4-1008-411C-AB2A-508F622B915C",
    },
    {
        "uuid": "DE54D688-35F5-496D-90B0-42D97FB85F85",
        "motivo": "01",
        "sustitucion": "F792DB1C-63DE-491A-B904-E53E3A108245",
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
