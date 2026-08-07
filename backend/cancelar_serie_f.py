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
# 📌 MAPEO EXACTO REESTRUCTURADO
# =====================================================================
UUIDS_A_CANCELAR = [
    {"uuid": "4CC84F95-BBAA-49E7-A76D-76158D8BE01F", "motivo": "02", "sustitucion": ""},
    {"uuid": "75834706-6320-4E26-BABA-3B3A7C8AF4AC", "motivo": "02", "sustitucion": ""},
    {
        "uuid": "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3",
        "motivo": "01",
        "sustitucion": "9C16B35F-DA07-4C4A-A9BF-04A4FFBB4A0D",
    },
    {
        "uuid": "AF0BCC30-7736-4744-9C5F-E79632054D5D",
        "motivo": "01",
        "sustitucion": "C971A107-ABC9-4854-817E-F8BA7E60C1A1",
    },
    {"uuid": "E53258D5-9011-42C7-A1D2-16263DB5361F", "motivo": "02", "sustitucion": ""},
    {"uuid": "CB771797-B8B8-45A0-A115-32BBEB7AA5B8", "motivo": "02", "sustitucion": ""},
    {"uuid": "AA2FFEBD-5CC3-42ED-AFD7-9017253A1E28", "motivo": "02", "sustitucion": ""},
    {"uuid": "BBFB78E3-D960-49AF-9A5E-A876B474D962", "motivo": "02", "sustitucion": ""},
    {"uuid": "750C712D-7DDB-4F06-B1F4-29E564155D32", "motivo": "02", "sustitucion": ""},
    {"uuid": "0826E309-7C61-488C-8628-96069558B563", "motivo": "02", "sustitucion": ""},
]


def disparar_cancelacion_sat():
    logger.info(
        f"Iniciando proceso de cancelación forzada para {len(UUIDS_A_CANCELAR)} UUIDs en el SAT..."
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

            for i in range(0, len(UUIDS_A_CANCELAR), BATCH_SIZE):
                num_lote = i // BATCH_SIZE + 1
                lote_dicts = UUIDS_A_CANCELAR[i : i + BATCH_SIZE]

                # Construir el array de cadenas inteligentemente
                lote_cadenas = []
                for item in lote_dicts:
                    if item["sustitucion"]:
                        # Si hay sustitución, van los 3 elementos
                        cadena = (
                            f"{item['uuid']}|{item['motivo']}|{item['sustitucion']}"
                        )
                    else:
                        # Si NO hay sustitución, solo mandamos 2 elementos (sin | al final)
                        cadena = f"{item['uuid']}|{item['motivo']}"

                    lote_cadenas.append(cadena)

                logger.info(f"Enviando lote {num_lote} ({len(lote_cadenas)} UUIDs)...")

                try:
                    resultado = client_zeep.service.cancelar(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        uuids=lote_cadenas,  # <-- Pasamos la lista limpia y directa
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

                            # Actualización en BD
                            uuid_puro_busqueda = u_res.split("|")[0].strip()
                            factura = (
                                db.query(ReceivableInvoice)
                                .filter(ReceivableInvoice.uuid == uuid_puro_busqueda)
                                .first()
                            )

                            if factura:
                                if (
                                    "error" in msg_res
                                    or "no cancelable" in msg_res
                                    or "rechaz" in msg_res
                                    or st_res == "621"
                                ):
                                    factura.status_sat = "ERROR_CANCELACION"
                                    factura.estatus = "pendiente"
                                    factura.saldo_pendiente = float(
                                        factura.monto_total or 0
                                    )
                                    factura.detalle_sat = (
                                        f"Rechazo SAT ({st_res}): {msg_res}"
                                    )
                                    logger.error(
                                        f"❌ Rechazo SAT en UUID {uuid_puro_busqueda} -> {msg_res}"
                                    )
                                elif st_res == "201" or "proceso" in msg_res:
                                    factura.status_sat = "PROCESO_CANCELACION"
                                    factura.detalle_sat = (
                                        f"En proceso ante el SAT: {msg_res}"
                                    )
                                    factura.fecha_cancelacion = datetime.utcnow()
                                    logger.info(
                                        f"⏳ UUID {uuid_puro_busqueda} entró en proceso de cancelación."
                                    )
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
                                else:
                                    factura.detalle_sat = (
                                        f"Respuesta SAT ({st_res}): {msg_res}"
                                    )

                                db.commit()
                            else:
                                logger.warning(
                                    f"⚠️ UUID {uuid_puro_busqueda} no fue encontrado en BD."
                                )

                            writer.writerow([num_lote, u_res, st_res, msg_res])
                    else:
                        logger.warning(
                            f"El PAC procesó el lote {num_lote} pero no devolvió desglose."
                        )

                except Exception as e_lote:
                    logger.error(f"❌ Error en Lote {num_lote}: {e_lote}")

        logger.info(f"📁 Evidencia guardada en: {csv_filename}")

    except Exception as e_general:
        logger.error(f"❌ Error fatal: {e_general}")
    finally:
        db.close()
        logger.info("Proceso terminado.")


if __name__ == "__main__":
    disparar_cancelacion_sat()
