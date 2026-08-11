import logging
import base64
import requests
from zeep import Client
from zeep.transports import Transport
from zeep.plugins import HistoryPlugin
from lxml import etree

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("VERIFICADOR_COMPLETO")

# ─────────────────────────────────────────────────────────────────────────────
# DATOS DE LA FACTURA CP-18166
# ─────────────────────────────────────────────────────────────────────────────
PAC_USER = "trafico2@3t.com.mx"
PAC_PASS = "iMbm2Z49.2_"

RFC_EMISOR = "RTX110624KP5"
RFC_RECEPTOR = "HMG980427Q42"
TOTAL_FACTURA = "44800.00"
UUID_FACTURA = "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35"

# ENDPOINT SOLICITADO
PAC_WSDL = "https://solucionfactible.com/ws/services/Cancelacion?wsdl"


def consultar_pac_getStatusCancelacionAsincrona():
    logger.info("===================================================================")
    logger.info("1️⃣ CONSULTA PAC: getStatusCancelacionAsincrona")
    logger.info("===================================================================\n")

    history = HistoryPlugin()
    transport = Transport(timeout=20)

    try:
        client = Client(PAC_WSDL, transport=transport, plugins=[history])

        # Invocación exacta al método requerido por la documentación
        resultado = client.service.getStatusCancelacionAsincrona(
            usuario=PAC_USER, password=PAC_PASS, transactionId=UUID_FACTURA
        )

        status_code = getattr(resultado, "status", None)
        mensaje = getattr(resultado, "mensaje", None)
        acuse_sat = getattr(resultado, "acuseSAT", None)

        logger.info("🟢 RESPUESTA DEL PAC:")
        logger.info(f"   • Status  : {status_code}")
        logger.info(f"   • Mensaje : {mensaje}")

        if acuse_sat:
            logger.info("\n   📜 Decodificando Acuse SAT (Base64)...")
            try:
                xml_str = base64.b64decode(acuse_sat).decode("utf-8")
                logger.info(xml_str)
            except Exception as b64_err:
                logger.error(f"Error decodificando acuse: {b64_err}")
        else:
            logger.info("   • Acuse SAT : No disponible en la respuesta")

    except Exception as e:
        logger.error(f"❌ Excepción al consultar el PAC: {e}")

    finally:
        if (
            hasattr(history, "_buffer")
            and len(history._buffer) > 0
            and history.last_received
        ):
            logger.info("\n--- XML CRUDO DE RESPUESTA DEL PAC ---")
            logger.info(
                etree.tostring(
                    history.last_received["envelope"],
                    pretty_print=True,
                    encoding="unicode",
                )
            )


def consultar_sat_oficial():
    logger.info("\n===================================================================")
    logger.info("2️⃣ CONSULTA OFICIAL SAT (SERVICIO PÚBLICO)")
    logger.info("===================================================================\n")

    sat_wsdl = (
        "https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl"
    )
    expresion = (
        f"?re={RFC_EMISOR}&rr={RFC_RECEPTOR}&tt={TOTAL_FACTURA}&id={UUID_FACTURA}"
    )

    try:
        session = requests.Session()
        session.verify = True
        transport = Transport(session=session, timeout=15)
        client = Client(sat_wsdl, transport=transport)

        resultado = client.service.Consulta(expresionImpresa=expresion)

        logger.info("🟢 RESPUESTA DEL SAT:")
        logger.info(f"   • Estado CFDI         : {getattr(resultado, 'Estado', 'N/A')}")
        logger.info(
            f"   • Estatus Cancelación : {getattr(resultado, 'EstatusCancelacion', 'N/A')}"
        )
        logger.info(
            f"   • Es Cancelable       : {getattr(resultado, 'EsCancelable', 'N/A')}"
        )

    except Exception as e:
        logger.error(f"❌ Error al consultar el SAT: {e}")


if __name__ == "__main__":
    consultar_pac_getStatusCancelacionAsincrona()
    consultar_sat_oficial()
