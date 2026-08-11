import logging
import requests
from zeep import Client
from zeep.transports import Transport

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("CONSULTA_SAT")

RFC_EMISOR = "RTX110624KP5"
RFC_RECEPTOR = "HMG980427Q42"
TOTAL = "44800.00"
UUID_FACTURA = "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35"


def consultar_sat():
    logger.info("🏛️ Consultando estatus fiscal DIRECTO EN EL SAT PÚBLICO...")
    sat_wsdl = (
        "https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl"
    )
    expresion = f"?re={RFC_EMISOR}&rr={RFC_RECEPTOR}&tt={TOTAL}&id={UUID_FACTURA}"

    try:
        session = requests.Session()
        session.verify = True
        client = Client(sat_wsdl, transport=Transport(session=session, timeout=15))
        resultado = client.service.Consulta(expresionImpresa=expresion)

        logger.info("🟢 RESPUESTA OFICIAL DEL SAT:")
        logger.info(
            f"   • Estado CFDI (Vigente/Cancelado): {getattr(resultado, 'Estado', 'N/A')}"
        )
        logger.info(
            f"   • Es Cancelable                  : {getattr(resultado, 'EsCancelable', 'N/A')}"
        )
    except Exception as e:
        logger.error(f"❌ Error SAT: {e}")


if __name__ == "__main__":
    consultar_sat()
