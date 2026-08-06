import sys
import os
import logging
import csv
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoice
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("cancelacion_forzada")

# =====================================================================
# 📌 MAPEO EXACTO: UUID_A_CANCELAR | MOTIVO | UUID_SUSTITUTO (Si aplica)
# =====================================================================
UUIDS_A_CANCELAR_MAPEADOS = [
    "EA5985B4-C9CD-435B-BC91-3A2FEB5D6031|02|",
    "E51913EA-44CA-4ACA-B86D-DF6A0F4E51E5|02|",
    "438d6580-56b8-4298-a7c2-0b46f5bde9cf|02|",
    "45460ac5-6d2b-4fed-a026-80f03f8f2efb|02|",
    "77d8e9e9-9845-47d7-8faa-6bfa8e4cdd9d|02|",
    "c29b0d75-9bae-4dc9-9c50-b95142a9d5dd|02|",
    "ce26475b-982a-4d50-bee3-81e7c0fcd828|02|",
    "cf7bcdf9-78ca-4809-a0ab-1396f79629f3|02|",
    "dd0dddbf-e716-4cf7-8900-5a4ca33221db|02|",
    "f6232e76-c7b7-449f-902d-bc7a9ec94a6e|02|",
    "f695b5a0-5e88-42cf-89b9-7eb32264a36b|02|",
    "554c256a-f77e-44cb-a635-d231eb1d2148|02|",
    "3d7a959f-fb14-4f84-9954-37dfa62a5e39|02|",
    "088ebdba-8fb5-4ff1-ab0d-60c2cffacc20|02|",
    "539a1b18-552a-4f0e-9f29-75d44256e1d1|02|",
    "b4195876-3ce6-406c-888c-14a7cebf232a|02|",
    "F56357D4-2843-4F19-86B7-630ACAE90F0F|02|",
    "D0DD96B3-9C0F-4B02-A545-A7D0E16209BF|02|",
    "CAD89286-5071-4770-AC01-4F8CBB678FA2|02|",
    "383343FD-82D7-4D3A-A8D7-2466021A5F61|02|",
    "02E690A1-F4AA-4451-904A-27A5EF5B8D8B|02|",
    "1318C90A-B6AA-4F79-929B-AAF3B4D40F69|02|",
    "E76A361D-5730-4BDB-9212-C692F45C2E04|02|",
    "1F22BA49-6674-4089-A92B-F34189A7FD64|02|",
    "48005C35-0984-4E2D-A755-EB2D852F15D0|02|",
    "BC4C821C-BB34-47C4-944B-856A57F28201|02|",
    "9191A006-6079-4A87-9132-FE3625810571|02|",
    "A817227D-8797-416F-9D1B-183BA582EDC4|02|",
    "26B39709-6189-4B17-9527-C14CBB1449BC|02|",
    "33E794A4-8EA4-4F11-B274-248F0BA7E2AC|02|",
    "9AC1FE06-4C15-44F0-9499-A2CE257E0415|02|",
    "D8E6D278-7F07-4BA0-B3A9-AFFE4F90AB01|02|",
    "8E4B869D-0502-4BCF-8F31-BCA7300CF97B|02|",
    "519A26FB-3EA9-4A35-9CD7-7CE1709DC11A|02|",
    "4B1FAFED-3221-4485-8EFB-8C59AE062EC4|02|",
    "097D2E77-8B28-4DFA-A9BA-F0D11C38FEBD|02|",
    "A4B6E278-4D46-45DF-9613-94F6D0FF19BD|02|",
    "A249B360-E975-44B6-8144-5180940E74A0|02|",
    "72DC2B64-FCF2-4F10-95BE-573E149A54B3|02|",
    "AF0BCC30-7736-4744-9C5F-E79632054D5D|02|",
    "12EF2D29-7D04-4C87-81AD-768C743D4CEB|02|",
    "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF|02|",
    "9F73FD07-B4A7-4699-A7EC-481BAA7496BE|02|",
    "16A13839-49E2-46D0-BE17-CB12360E1E49|02|",
    "C9ECD3BD-A1EA-4CF0-9A26-95672D18E03D|02|",
    "2A5ED0D3-F219-48AC-8C5C-1ACF0160E7BA|02|",
    "26D54643-486C-4FD3-89CC-79D7226494B1|02|",
    "C567C900-047C-4B0D-A0BE-F4446C2AE69A|02|",
    "E33E7737-7CDE-4B5B-BD9C-85631C548377|02|",
    "E274FF8D-CA5C-48E1-ACCC-2C09529019BC|02|",
    "81088AD1-5976-4FA0-B5F4-B1EAC4CF36F4|02|",
    "7DB87625-E8FE-4026-AC3D-AB61647B0B25|02|",
    "0A262953-D74C-4019-8943-26218E8CFB30|02|",
    "E5E6964B-07C2-4365-9BD4-B6677DF35ED3|02|",
    "EF1E811E-A51E-4371-89CF-868D7F6681F4|02|",
    "702735D6-8975-48A8-B8A9-1B61EC716AEE|02|",
    "4C88C059-5A76-4C8A-819F-897171E31838|02|",
    "9F9C4748-02A1-40C2-BDCD-6EF862C66B41|02|",
    "49100456-EF69-458B-84B5-8A20F5389BB0|02|",
    "0F1A3B0B-725E-4EEB-9D17-8F8D467B7BDF|02|",
    "2624E912-4210-46B4-86C1-AC9AEBA9E604|02|",
    "7033B334-AC59-45FB-A86E-B4025549A9C9|02|",
    "05A343AE-AFF2-4A1F-A06A-413FD49B3D16|02|",
    "C4EA4AB8-3DC4-4CFD-942E-735052420725|02|",
    "725EA400-A4FB-4933-9FD1-7FA51ED4AF65|02|",
    "75834706-6320-4E26-BABA-3B3A7C8AF4AC|02|",
    "45B253B4-7A67-4387-AC0E-5C6E988A3095|02|",
    "FFE352ED-48AE-473C-9759-A17D50CBD9AF|02|",
    "4327C425-4376-4892-BA11-49A4656602C7|02|",
    "D20ABF05-85E6-4701-B066-3098B90FE295|02|",
    "73F9E6AE-4C72-4D1A-A568-7561658F429F|02|",
    "CC188A1E-C0A1-4C16-B14C-015C36BEC623|02|",
    "09F09DE4-C139-48F1-821C-42B6C493CDA5|02|",
    "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3|02|",
    "0E72BD82-8253-481D-80B2-35E0F8919E06|02|",
    "4FCE8965-1717-4F4F-95D9-CC99A8DC9202|02|",
    "3DE591D1-B2E9-484E-BAC8-8BFF9EC8DF78|02|",
    "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35|02|",
    "8FCFB2B9-6A5C-4FEB-8CA6-607578C1BBE1|02|",
    "E51913EA-44CA-4ACA-B86D-DF6A0F4E51E5|02|",
    "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35|02|",
]


def disparar_cancelacion_sat():
    # Limpiamos y preparamos la lista directamente desde el mapeo
    uuids_limpios = list(
        dict.fromkeys(
            [u.strip().upper() for u in UUIDS_A_CANCELAR_MAPEADOS if u.strip()]
        )
    )

    logger.info(
        f"Iniciando proceso de cancelación forzada para {len(uuids_limpios)} UUIDs en el SAT..."
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

        BATCH_SIZE = 50

        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(["Num_Lote", "UUID", "Status_SAT", "Mensaje_SAT"])

            for i in range(0, len(uuids_limpios), BATCH_SIZE):
                num_lote = i // BATCH_SIZE + 1

                # Usamos directamente las cadenas formateadas UUID|MOTIVO|SUSTITUTO
                lote = uuids_limpios[i : i + BATCH_SIZE]

                logger.info(f"Enviando lote {num_lote} ({len(lote)} UUIDs)...")

                try:
                    resultado = client_zeep.service.cancelar(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        uuids=lote,  # <-- Ya llevan el formato correcto
                        derCertCSD=cer_bytes,
                        derKeyCSD=key_bytes,
                        contrasenaCSD=service.key_password,
                    )

                    logger.info(
                        f"Respuesta Lote {num_lote} - Status: {getattr(resultado, 'status', 'S/S')} | Mensaje: {getattr(resultado, 'mensaje', 'S/M')}"
                    )

                    if hasattr(resultado, "resultados") and resultado.resultados:
                        print("\n" + "=" * 70)
                        print(f"📊 DETALLE DE CANCELACIÓN (LOTE {num_lote}):")
                        print("=" * 70)

                        for res in resultado.resultados:
                            u_res = (
                                str(getattr(res, "uuid", "DESCONOCIDO")).strip().upper()
                            )
                            st_res = str(getattr(res, "status", "Sin Status"))
                            msg_res = str(
                                getattr(res, "mensaje", "Sin Mensaje")
                            ).lower()

                            print(f"UUID: {u_res}")
                            print(f"Status SAT: {st_res}")
                            print(f"Mensaje Hacienda: {msg_res}")
                            print("-" * 70)

                            # =========================================================
                            # 🛠️ ACTUALIZACIÓN DIRECTA EN BASE DE DATOS
                            # =========================================================
                            # El PAC devuelve "UUID|MOTIVO|SUSTITUTO", extraemos solo el UUID puro
                            uuid_puro_busqueda = u_res.split("|")[0].strip()

                            factura = (
                                db.query(ReceivableInvoice)
                                .filter(ReceivableInvoice.uuid == uuid_puro_busqueda)
                                .first()
                            )

                            if factura:
                                # Escenario 1: Error explícito retornado por el SAT
                                if (
                                    "error" in msg_res
                                    or "no cancelable" in msg_res
                                    or "rechaz" in msg_res
                                ):
                                    factura.status_sat = "ERROR_CANCELACION"
                                    factura.estatus = "pendiente"
                                    # Restauramos el saldo porque el SAT la rechazó
                                    factura.saldo_pendiente = float(
                                        factura.monto_total or 0
                                    )
                                    factura.detalle_sat = (
                                        f"Rechazo SAT ({st_res}): {msg_res}"
                                    )
                                    logger.error(
                                        f"❌ Rechazo SAT en UUID {uuid_puro_busqueda} -> {msg_res}"
                                    )

                                # Escenario 2: Solicitud recibida y en proceso por el SAT
                                elif st_res == "201" or "proceso" in msg_res:
                                    factura.status_sat = "PROCESO_CANCELACION"
                                    factura.detalle_sat = (
                                        f"En proceso ante el SAT: {msg_res}"
                                    )
                                    factura.fecha_cancelacion = datetime.utcnow()
                                    logger.info(
                                        f"⏳ UUID {uuid_puro_busqueda} entró en proceso de cancelación."
                                    )

                                # Escenario 3: Cancelación exitosa o ya cancelada previamente
                                elif (
                                    st_res == "202"
                                    or "previamente cancelado" in msg_res
                                    or "ya se encuentra cancelado" in msg_res
                                    or (st_res == "200" and "exito" in msg_res)
                                ):
                                    factura.status_sat = "CANCELADO"
                                    factura.estatus = "cancelado"
                                    factura.saldo_pendiente = 0.0
                                    factura.detalle_sat = (
                                        f"Cancelación confirmada: {msg_res}"
                                    )
                                    factura.fecha_cancelacion = datetime.utcnow()
                                    logger.info(
                                        f"✅ UUID {uuid_puro_busqueda} marcado como CANCELADO en BD."
                                    )

                                # Escenario 4: Mensaje desconocido pero con Status 200 general
                                else:
                                    factura.detalle_sat = (
                                        f"Respuesta SAT ({st_res}): {msg_res}"
                                    )

                                db.commit()  # 👈 ¡GUARDA EL CAMBIO EN LA BD!
                            else:
                                logger.warning(
                                    f"⚠️ UUID {uuid_puro_busqueda} no fue encontrado en la tabla receivable_invoices."
                                )
                            # =========================================================

                            writer.writerow([num_lote, u_res, st_res, msg_res])
                    else:
                        logger.warning(
                            f"El PAC procesó el lote {num_lote} pero no devolvió el desglose individual."
                        )

                except Exception as e_lote:
                    logger.error(
                        f"❌ Error crítico en el Lote {num_lote}: {e_lote}. Saltando al siguiente bloque..."
                    )
                    for uuid_fallido in lote:
                        writer.writerow(
                            [num_lote, uuid_fallido, "ERROR_EXCEPCION", str(e_lote)]
                        )
                    continue

        logger.info(f"📁 Evidencia guardada exitosamente en: {csv_filename}")

    except Exception as e_general:
        logger.error(
            f"❌ Ocurrió un error fatal al inicializar certificados o conexión al PAC: {e_general}"
        )
    finally:
        db.close()
        logger.info("Proceso terminado. Conexión cerrada.")


if __name__ == "__main__":
    disparar_cancelacion_sat()
