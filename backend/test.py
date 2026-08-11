import os
import sys
import logging
from zeep import Client
from zeep.transports import Transport
from zeep.plugins import HistoryPlugin
from lxml import etree

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("DEBUG_PAC")

# ─────────────────────────────────────────────────────────────────────────────
# 1. CREDENCIALES DE PRODUCCIÓN DEL PAC
# ─────────────────────────────────────────────────────────────────────────────
PAC_USER = "trafico2@3t.com.mx"
PAC_PASS = "iMbm2Z49.2_"

RFC_EMISOR = "RTX110624KP5"
UUID_FACTURA = "0872026F-B4A3-4773-ACAC-6B4E710F8D0D"  # CP-17661
MOTIVO_CANCELACION = "02"

# ─────────────────────────────────────────────────────────────────────────────
# 2. RUTAS EXACTAS DEL CSD DE PRODUCCIÓN (Tomadas de la BD)
# ─────────────────────────────────────────────────────────────────────────────
CSD_CER_PATH = (
    "/home/desarrolloas/base-foundation/backend/app/certs/CSD_PROD_20260527_110946.cer"
)
CSD_KEY_PATH = (
    "/home/desarrolloas/base-foundation/backend/app/certs/CSD_PROD_20260527_110946.key"
)
CSD_PASSWORD = "RTX110624"

PAC_WSDL = "https://solucionfactible.com/ws/services/Cancelacion?wsdl"


def depurar_cancelacion():
    logger.info("===================================================================")
    logger.info("🔍 DEBUG DE CONEXIÓN AL WSDL DE CANCELACIÓN (SOLUCIÓN FACTIBLE)")
    logger.info("===================================================================\n")

    cadena_uuid = f"{UUID_FACTURA}|{MOTIVO_CANCELACION}|"
    logger.info(f"👉 URL Destino : {PAC_WSDL}")
    logger.info(f"👉 Cadena UUID : {cadena_uuid}\n")

    # Leer los archivos del CSD en formato binario
    try:
        with open(CSD_CER_PATH, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(CSD_KEY_PATH, "rb") as f_key:
            key_bytes = f_key.read()
        logger.info("✅ Archivos CSD leídos correctamente.")
    except Exception as e:
        logger.error(f"❌ Error al leer los archivos CSD físicos: {e}")
        return

    history = HistoryPlugin()
    transport = Transport(timeout=20)

    try:
        client = Client(PAC_WSDL, transport=transport, plugins=[history])
    except Exception as e:
        logger.error(f"❌ Error al cargar el WSDL: {e}")
        return

    try:
        logger.info("\n⏳ Enviando petición firmada a Solución Factible...")
        resultado = client.service.cancelarAsincrono(
            usuario=PAC_USER,
            password=PAC_PASS,
            uuid=cadena_uuid,
            rfcEmisor=RFC_EMISOR,
            emailNotifica="trafico2@3t.com.mx",
            csdCer=cer_bytes,
            csdKey=key_bytes,
            csdPassword=CSD_PASSWORD,
        )

        status_code = getattr(resultado, "status", None)
        mensaje = getattr(resultado, "mensaje", None)

        logger.info("\n🟢 RESPUESTA PARSEADA DEL PAC:")
        logger.info(f"   Status  : {status_code}")
        logger.info(f"   Mensaje : {mensaje}\n")

    except Exception as e:
        logger.error(f"❌ Excepción durante la llamada SOAP: {e}")

        if (
            hasattr(history, "_buffer")
            and len(history._buffer) > 0
            and history.last_received
        ):
            logger.error("\n--- EL PAC RESPONDIÓ CON ESTE XML ---")
            logger.error(
                etree.tostring(
                    history.last_received["envelope"],
                    pretty_print=True,
                    encoding="unicode",
                )
            )


if __name__ == "__main__":
    depurar_cancelacion()
