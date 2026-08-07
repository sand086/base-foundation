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
    "4CC84F95-BBAA-49E7-A76D-76158D8BE01F|02|",
    "75834706-6320-4E26-BABA-3B3A7C8AF4AC|02|",
    "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3|01|9C16B35F-DA07-4C4A-A9BF-04A4FFBB4A0D",
    "AF0BCC30-7736-4744-9C5F-E79632054D5D|01|C971A107-ABC9-4854-817E-F8BA7E60C1A1",
    "E53258D5-9011-42C7-A1D2-16263DB5361F",
    "CB771797-B8B8-45A0-A115-32BBEB7AA5B8",
    "AA2FFEBD-5CC3-42ED-AFD7-9017253A1E28",
    "BBFB78E3-D960-49AF-9A5E-A876B474D962",
    "750C712D-7DDB-4F06-B1F4-29E564155D32",
    "0826E309-7C61-488C-8628-96069558B563",
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
