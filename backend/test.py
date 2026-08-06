import sys
import os
import logging
import csv
import time
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
logger = logging.getLogger("cancelacion_mixta")

# =====================================================================
# 📌 LISTA MIXTA: 4 Nuevas (Motivo 02) + 4 Timeouts (Motivo 01)
# =====================================================================
UUIDS_A_PROCESAR = [
    # --- 1. LAS 4 NUEVAS CARTAS PORTE A CANCELAR (MOTIVO 02) ---
    "3A4F7A92-8245-45FA-9F5C-DC8281A5E432|02|",
    "AB2DBA8B-0DC3-4B27-8BBD-14FE9E6F3AB4|02|",
    "9B15BE22-E81B-4976-BCA5-AB67999EF007|02|",
    "021187BA-D746-406D-813D-31A033B93E6C|02|",
    # --- 2. LOS 4 TIMEOUTS DEL INTENTO ANTERIOR (MOTIVO 01 CON SUSTITUTO) ---
    "C9ECD3BD-A1EA-4CF0-9A26-95672D18E03D|01|135B69E5-3EDE-432D-81FD-9A438504635B",
    "FFE352ED-48AE-473C-9759-A17D50CBD9AF|01|38F1C9A5-AE01-4EB0-B431-74BBC67C192A",
    "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF|01|A7BD2256-A76E-4D3B-8771-31863EFDA81A",
    "C567C900-047C-4B0D-A0BE-F4446C2AE69A|01|9A746BF0-9F2A-4297-B536-ABC2728F22E5",
]


def disparar_cancelacion_mixta():
    uuids_limpios = [u.strip().upper() for u in UUIDS_A_PROCESAR if u.strip()]

    logger.info(f"🚀 Iniciando proceso para {len(uuids_limpios)} UUIDs...")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_reintentos_{timestamp}.csv"

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(["Parametro_Enviado", "Status_SAT", "Mensaje_SAT"])

            logger.info("Enviando bloque al PAC Solución Factible...")

            try:
                resultado = client_zeep.service.cancelar(
                    usuario=service.pac_user,
                    password=service.pac_pass,
                    uuids=uuids_limpios,
                    derCertCSD=cer_bytes,
                    derKeyCSD=key_bytes,
                    contrasenaCSD=service.key_password,
                )

                if hasattr(resultado, "resultados") and resultado.resultados:
                    print("\n" + "=" * 70)
                    print("📊 DETALLE DE CANCELACIÓN:")
                    print("=" * 70)

                    for res in resultado.resultados:
                        u_res = str(getattr(res, "uuid", "DESCONOCIDO")).strip().upper()
                        st_res = str(getattr(res, "status", "Sin Status"))
                        msg_res = str(getattr(res, "mensaje", "Sin Mensaje")).lower()

                        print(f"Petición: {u_res}")
                        print(f"Status SAT: {st_res}")
                        print(f"Mensaje Hacienda: {msg_res}")
                        print("-" * 70)

                        # Actualizar base de datos
                        uuid_puro = u_res.split("|")[0].strip()
                        factura = (
                            db.query(ReceivableInvoice)
                            .filter(ReceivableInvoice.uuid == uuid_puro)
                            .first()
                        )

                        if factura:
                            if (
                                "error" in msg_res
                                or "no cancelable" in msg_res
                                or "rechaz" in msg_res
                            ):
                                factura.status_sat = "ERROR_CANCELACION"
                                factura.estatus = "pendiente"
                                factura.detalle_sat = (
                                    f"Rechazo SAT ({st_res}): {msg_res}"
                                )
                            elif st_res == "201" or "proceso" in msg_res:
                                factura.status_sat = "PROCESO_CANCELACION"
                                factura.detalle_sat = (
                                    f"En proceso ante el SAT: {msg_res}"
                                )
                                factura.fecha_cancelacion = datetime.utcnow()
                            elif (
                                st_res == "202"
                                or "previamente cancelado" in msg_res
                                or (st_res == "200" and "exito" in msg_res)
                            ):
                                factura.status_sat = "CANCELADO"
                                factura.estatus = "cancelado"
                                factura.saldo_pendiente = 0.0
                                factura.detalle_sat = (
                                    f"Cancelación confirmada: {msg_res}"
                                )
                                factura.fecha_cancelacion = datetime.utcnow()
                            else:
                                factura.detalle_sat = (
                                    f"Respuesta SAT ({st_res}): {msg_res}"
                                )

                            db.commit()

                        writer.writerow([u_res, st_res, msg_res])
                else:
                    logger.warning("El SAT no devolvió desglose individual.")

            except Exception as e_peticion:
                logger.error(f"❌ Error al conectar con el PAC: {e_peticion}")

        logger.info(f"📁 Evidencia guardada en: {csv_filename}")

    except Exception as e_general:
        logger.error(f"❌ Error crítico: {e_general}")
    finally:
        db.close()
        logger.info("Proceso terminado.")


if __name__ == "__main__":
    disparar_cancelacion_mixta()
