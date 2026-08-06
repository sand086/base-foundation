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
# (Se han removido las 46 facturas que se procesarán en cancelar_viejas_motivo01.py)
# =====================================================================
UUIDS_A_CANCELAR_MAPEADOS = [
    # En proceso de cancelación (F-9820 - Aprox)
    "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35|02|",
    # Previamente cancelada (F-9821)
    "3A04D26A-ABC3-40A6-B70F-7E55C88B053F|02|",
    # Previamente cancelada (Sustituto fallido previo)
    "17F5AAB8-B202-4FC6-ADE4-7352E1C0EB9A|02|",
    # ⚠️ Casos especiales que ya tenían Motivo 01 configurado
    "CAD89286-5071-4770-AC01-4F8CBB678FA2|01|D0DD96B3-9C0F-4B02-A545-A7D0E16209BF",
    "D0DD96B3-9C0F-4B02-A545-A7D0E16209BF|01|F56357D4-2843-4F19-86B7-630ACAE90F0F",
    # Duplicados / Historial de la lista original
    "D0DD96B3-9C0F-4B02-A545-A7D0E16209BF|02|",
    "CAD89286-5071-4770-AC01-4F8CBB678FA2|02|",
    "56357D4-2843-4F19-86B7-630ACAE90F0F|02|",
    "F56357D4-2843-4F19-86B7-630ACAE90F0F|02|",
    "383343FD-82D7-4D3A-A8D7-2466021A5F61|02|",
    "02E690A1-F4AA-4451-904A-27A5EF5B8D8B|02|",
    "1318C90A-B6AA-4F79-929B-AAF3B4D40F69|02|",
    "1F22BA49-6674-4089-A92B-F34189A7FD64|02|",
    "E274FF8D-CA5C-48E1-ACCC-2C09529019BC|02|",
    # UUIDs adicionales (Rechazados por fechas, timeout o que NO entraron en las 46 mapeadas)
    "AF0BCC30-7736-4744-9C5F-E79632054D5D|02|",
    "CC188A1E-C0A1-4C16-B14C-015C36BEC623|02|",
    "09F09DE4-C139-48F1-821C-42B6C493CDA5|02|",
    "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3|02|",
    "0E72BD82-8253-481D-80B2-35E0F8919E06|02|",
    "4FCE8965-1717-4F4F-95D9-CC99A8DC9202|02|",
    "3DE591D1-B2E9-484E-BAC8-8BFF9EC8DF78|02|",
    "EA5985B4-C9CD-435B-BC91-3A2FEB5D6031|02|",
    "E51913EA-44CA-4ACA-B86D-DF6A0F4E51E5|02|",
    # Lote final (los que pasaron bien a 'proceso' o tenían otros estatus)
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
