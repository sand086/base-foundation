import logging
import requests
from zeep import Client
from zeep.transports import Transport

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("SAT_DIRECTO")

# ─────────────────────────────────────────────────────────────────────────────
# DATOS DE LA FACTURA CP-18166
# ─────────────────────────────────────────────────────────────────────────────
RFC_EMISOR = "RTX110624KP5"  # RAPIDOS 3T
RFC_RECEPTOR = "HMG980427Q42"  # Receptor
TOTAL_FACTURA = "44800.00"  # Monto total
UUID_FACTURA = "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35"


def consultar_sat_oficial():
    logger.info("===================================================================")
    logger.info("🏛️ CONSULTA DE ESTATUS REAL DIRECTO EN EL SAT (SIN BASE DE DATOS)")
    logger.info("===================================================================\n")

    # WSDL Público y oficial del SAT para consultar estatus de CFDI
    sat_wsdl = (
        "https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl"
    )

    # Cadena exacta que exige el SAT
    expresion = (
        f"?re={RFC_EMISOR}&rr={RFC_RECEPTOR}&tt={TOTAL_FACTURA}&id={UUID_FACTURA}"
    )
    logger.info(f"👉 Consultando UUID : {UUID_FACTURA}")
    logger.info(f"👉 Cadena enviada   : {expresion}\n")

    try:
        session = requests.Session()
        session.verify = True
        transport = Transport(session=session, timeout=15)
        client = Client(sat_wsdl, transport=transport)

        logger.info("⏳ Esperando respuesta del SAT...\n")
        resultado = client.service.Consulta(expresionImpresa=expresion)

        logger.info("🟢 RESPUESTA OFICIAL DEL SAT:")
        logger.info(f"   • Estado CFDI         : {getattr(resultado, 'Estado', 'N/A')}")
        logger.info(
            f"   • Estatus Cancelación : {getattr(resultado, 'EstatusCancelacion', 'N/A')}"
        )
        logger.info(
            f"   • Es Cancelable       : {getattr(resultado, 'EsCancelable', 'N/A')}"
        )

    except Exception as e:
        logger.error(f"❌ Error de conexión con el SAT: {e}")


if __name__ == "__main__":
    consultar_sat_oficial()
