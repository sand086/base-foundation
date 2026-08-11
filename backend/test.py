import logging
from zeep import Client
from zeep.transports import Transport

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("CONSULTA_PAC")

PAC_USER = "trafico2@3t.com.mx"
PAC_PASS = "iMbm2Z49.2_"
UUID_FACTURA = "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35"
PAC_WSDL = "https://solucionfactible.com/ws/services/Cancelacion?wsdl"


def consultar_pac():
    logger.info(
        "🔍 Consultando estatus de cancelación en el PAC (getStatusCancelacionAsincrona)..."
    )
    try:
        client = Client(PAC_WSDL, transport=Transport(timeout=20))
        resultado = client.service.getStatusCancelacionAsincrona(
            usuario=PAC_USER, password=PAC_PASS, transactionId=UUID_FACTURA
        )
        logger.info(
            f"🟢 ESTATUS PAC: {getattr(resultado, 'status', 'N/A')} - {getattr(resultado, 'mensaje', 'N/A')}"
        )
    except Exception as e:
        logger.error(f"❌ Error PAC: {e}")


if __name__ == "__main__":
    consultar_pac()
