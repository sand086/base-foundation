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
logger = logging.getLogger("cancelacion_parejas")

# =====================================================================
# 📌 1. FACTURAS NUEVAS (Se cancelan primero con Motivo 02)
# =====================================================================
NUEVAS_MOTIVO_02 = [
    "3A4F7A92-8245-45FA-9F5C-DC8281A5E432|02|",
    "AB2DBA8B-0DC3-4B27-8BBD-14FE9E6F3AB4|02|",
    "9B15BE22-E81B-4976-BCA5-AB67999EF007|02|",
    "021187BA-D746-406D-813D-31A033B93E6C|02|",
]

# =====================================================================
# 📌 2. FACTURAS VIEJAS (Una vez libres, se cancelan con Motivo 02)
# =====================================================================
VIEJAS_MOTIVO_02 = [
    "E5E6964B-07C2-4365-9BD4-B6677DF35ED3|02|",
    "EF1E811E-A51E-4371-89CF-868D7F6681F4|02|",
    "C4EA4AB8-3DC4-4CFD-942E-735052420725|02|",
    "A4B6E278-4D46-45DF-9613-94F6D0FF19BD|02|",
]


def procesar_lote(client_zeep, db, pac_config, uuids, tipo, writer):
    logger.info(f"\n--- Procesando Lote de Facturas {tipo} ({len(uuids)} folios) ---")

    for param_cancelacion in uuids:
        uuid_puro = param_cancelacion.split("|")[0]
        logger.info(f"🔪 Enviando a cancelar: {uuid_puro}")

        try:
            resultado = client_zeep.service.cancelar(
                usuario=pac_config["user"],
                password=pac_config["pass"],
                uuids=[param_cancelacion],
                derCertCSD=pac_config["cer"],
                derKeyCSD=pac_config["key"],
                contrasenaCSD=pac_config["key_pass"],
            )

            res_sat = resultado.resultados[0]
            codigo = getattr(res_sat, "status", 0)
            mensaje = str(getattr(res_sat, "mensaje", "")).lower()
            actualizado = "NO"

            # ACTUALIZAR BD
            factura = (
                db.query(ReceivableInvoice)
                .filter(ReceivableInvoice.uuid == uuid_puro)
                .first()
            )
            if factura:
                if (
                    codigo in [201, 202, 211]
                    or "proceso" in mensaje
                    or "previamente" in mensaje
                    or "exito" in mensaje
                ):
                    factura.status_sat = (
                        "PROCESO_CANCELACION"
                        if codigo != 202 and "previamente" not in mensaje
                        else "CANCELADO"
                    )
                    factura.estatus = "cancelado"
                    factura.saldo_pendiente = 0.0
                    factura.detalle_sat = f"SAT: {mensaje}"
                    factura.fecha_cancelacion = datetime.utcnow()
                    db.commit()
                    actualizado = f"SÍ ({factura.estatus})"
                    logger.info(
                        f"   ✅ ÉXITO: {mensaje} -> Guardado en BD como {factura.estatus}"
                    )
                else:
                    factura.detalle_sat = f"Rechazo: {mensaje}"
                    db.commit()
                    actualizado = "SÍ (RECHAZO)"
                    logger.warning(f"   ⚠️ RECHAZO: {mensaje}")
            else:
                logger.error(f"   ❌ El UUID {uuid_puro} no está en la BD.")

            writer.writerow([tipo, uuid_puro, codigo, mensaje, actualizado])

        except Exception as e:
            logger.error(f"   ❌ Error de conexión: {str(e)}")
            writer.writerow([tipo, uuid_puro, "ERROR", str(e), "NO"])

        time.sleep(2)  # Pausa obligatoria para que el SAT asimile la cancelación


def disparar_parejas():
    db = SessionLocal()
    service = PaymentComplementService(db)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_4_parejas_{timestamp}.csv"

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        pac_config = {
            "user": service.pac_user,
            "pass": service.pac_pass,
            "cer": cer_bytes,
            "key": key_bytes,
            "key_pass": service.key_password,
        }

        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(
                [
                    "Tipo_Factura",
                    "UUID",
                    "Status_SAT",
                    "Mensaje_SAT",
                    "Actualizado_En_BD",
                ]
            )

            # 1. Matar las nuevas primero
            procesar_lote(
                client_zeep, db, pac_config, NUEVAS_MOTIVO_02, "NUEVAS", writer
            )

            logger.info(
                "\n⏳ Esperando 10 segundos para que el SAT procese la ruptura de relación..."
            )
            time.sleep(10)

            # 2. Matar las viejas ahora que están libres
            procesar_lote(
                client_zeep, db, pac_config, VIEJAS_MOTIVO_02, "VIEJAS", writer
            )

        logger.info(
            f"\n✅ PROCESO COMPLETADO. Base de datos actualizada. Evidencia en {csv_filename}"
        )

    except Exception as e_general:
        logger.error(f"❌ Error crítico: {e_general}")
    finally:
        db.close()


if __name__ == "__main__":
    disparar_parejas()
