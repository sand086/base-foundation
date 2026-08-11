import logging
import base64
from zeep import Client
from zeep.transports import Transport
from zeep.plugins import HistoryPlugin
from lxml import etree

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("DEBUG_PAC_STATUS")

# ─────────────────────────────────────────────────────────────────────────────
# 1. CREDENCIALES DE PRODUCCIÓN DEL PAC
# ─────────────────────────────────────────────────────────────────────────────
PAC_USER = "trafico2@3t.com.mx"
PAC_PASS = "iMbm2Z49.2_"

# El UUID de la factura CP-18166
UUID_TRANSACCION = "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35"

# URL EXACTA DEL WSDL DE CANCELACIÓN
PAC_WSDL = "https://solucionfactible.com/ws/services/Cancelacion?wsdl"


def obtener_status_cancelacion_nuevo():
    logger.info("===================================================================")
    logger.info("🔍 CONSULTANDO ESTADO DE CANCELACIÓN (getStatusCancelacionAsincrona)")
    logger.info("===================================================================\n")

    logger.info(f"👉 URL Destino     : {PAC_WSDL}")
    logger.info(f"👉 UUID Transacción: {UUID_TRANSACCION}\n")

    history = HistoryPlugin()
    transport = Transport(timeout=20)

    try:
        client = Client(PAC_WSDL, transport=transport, plugins=[history])
    except Exception as e:
        logger.error(f"❌ Error al cargar el WSDL: {e}")
        return

    try:
        logger.info("⏳ Solicitando el estatus al PAC...")

        # LOS PARÁMETROS EXACTOS SEGÚN LA FIRMA DEL WSDL (usuario, password, transactionId)
        resultado = client.service.getStatusCancelacionAsincrona(
            usuario=PAC_USER, password=PAC_PASS, transactionId=UUID_TRANSACCION
        )

        status_code = getattr(resultado, "status", None)
        mensaje = getattr(resultado, "mensaje", None)
        acuse_sat = getattr(resultado, "acuseSAT", None)

        logger.info("\n🟢 RESPUESTA PARSEADA DEL PAC:")
        logger.info(f"   Status HTTP : {status_code}")
        logger.info(f"   Mensaje     : {mensaje}")

        if acuse_sat:
            logger.info("\n   📜 ¡Acuse del SAT disponible! Decodificando Base64...\n")
            try:
                xml_str = base64.b64decode(acuse_sat).decode("utf-8")
                logger.info("--- ACUSE OFICIAL DEL SAT ---")
                logger.info(xml_str)
            except Exception as b64_err:
                logger.error(f"Error decodificando el acuse: {b64_err}")
                logger.info(acuse_sat)
        else:
            logger.info("   📜 Acuse SAT : No disponible aún o vacío.")

        # Interpretación Oficial
        logger.info("\n--- INTERPRETACIÓN OFICIAL ---")
        if status_code == 200:
            logger.info(
                "✅ 200: La solicitud de cancelación se completó exitosamente ante el SAT."
            )
        elif status_code == 204:
            logger.info(
                "❌ 204: El comprobante NO SE PUEDE CANCELAR (Bloqueado por el SAT)."
            )
        elif status_code == 211:
            logger.info(
                "⏳ 211: La cancelación está EN PROCESO (Pendiente de aceptación por el receptor)."
            )
        elif status_code == 213:
            logger.info(
                "❌ 213: La solicitud de cancelación fue RECHAZADA por el receptor."
            )
        elif status_code == 702:
            logger.warning(
                "⚠️ 702: No se encuentra la transacción con el UUID especificado."
            )
            logger.warning(
                "   (Esto significa que NUNCA SE ENVIÓ la orden de cancelación asíncrona para esta factura)"
            )
        else:
            logger.warning(f"ℹ️ Código {status_code}: Revisa la tabla de errores.")

    except Exception as e:
        logger.error(f"\n❌ Excepción durante la llamada SOAP: {e}")

    finally:
        # Imprimimos los XML crudos de red para depuración
        if hasattr(history, "_buffer") and len(history._buffer) > 0:
            if history.last_sent:
                logger.info("\n--- XML ENVIADO AL PAC ---")
                logger.info(
                    etree.tostring(
                        history.last_sent["envelope"],
                        pretty_print=True,
                        encoding="unicode",
                    )
                )

            if history.last_received:
                logger.info("\n--- XML CRUDO RECIBIDO DEL PAC ---")
                logger.info(
                    etree.tostring(
                        history.last_received["envelope"],
                        pretty_print=True,
                        encoding="unicode",
                    )
                )


if __name__ == "__main__":
    obtener_status_cancelacion_nuevo()
