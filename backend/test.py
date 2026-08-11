import os
import sys
import logging
import requests
from zeep import Client
from zeep.transports import Transport

# Configuración de Logs limpia en pantalla
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("VERIFICADOR_SIN_BD")

# ─────────────────────────────────────────────────────────────────────────────
# 1. DATOS REALES DE LA FACTURA (Tomados de tu consulta del SAT)
# ─────────────────────────────────────────────────────────────────────────────
RFC_EMISOR = "RTX110624KP5"  # RAPIDOS 3T
RFC_RECEPTOR = "SBM000609616"  # SAVINO DEL BENE MEXICO
UUID_FACTURA = "0872026F-B4A3-4773-ACAC-6B4E710F8D0D"
TOTAL_FACTURA = "89600.00"

# ─────────────────────────────────────────────────────────────────────────────
# 2. CREDENTENCIALES PAC (Lee de tus variables de entorno si existen)
# ─────────────────────────────────────────────────────────────────────────────
PAC_USER = os.getenv("PAC_USER", "tu_usuario_pac@3t.com.mx")
PAC_PASS = os.getenv("PAC_PASS", "tu_password_pac")
PAC_WSDL = os.getenv("PAC_WSDL", "https://solucionfactible.com/ws/timbrado.php?wsdl")


def consultar_pac_solucion_factible():
    """
    Consulta el método 'obtenerDatos' en el Web Service de Solución Factible
    SIN TOCAR LA BASE DE DATOS.
    """
    logger.info("📡 [PAC Solución Factible] Consultando el comprobante...")
    try:
        transport = Transport(timeout=15)
        client = Client(PAC_WSDL, transport=transport)

        # Llamada directa al Web Service del PAC
        resultado = client.service.obtenerDatos(
            usuario=PAC_USER,
            password=PAC_PASS,
            uuid=UUID_FACTURA,
            folio=None,
            serie=None,
        )

        status_code = int(getattr(resultado, "status", 0))
        mensaje = getattr(resultado, "mensaje", "")

        logger.info(f"  • Código de Respuesta PAC : {status_code}")
        logger.info(f"  • Mensaje PAC              : {mensaje}")

        if (
            status_code == 200
            and hasattr(resultado, "comprobantes")
            and resultado.comprobantes
        ):
            comp = resultado.comprobantes[0]
            logger.info("--- DATOS DEL COMPROBANTE EN EL PAC ---")
            logger.info(f"  • Folio      : {getattr(comp, 'folio', 'N/A')}")
            logger.info(f"  • Serie      : {getattr(comp, 'nombreSerie', 'N/A')}")
            logger.info(f"  • Cliente    : {getattr(comp, 'nombreCliente', 'N/A')}")
            logger.info(f"  • Importe    : ${getattr(comp, 'importeTotal', 0.0)}")
            logger.info(f"  • Estado PAC : {getattr(comp, 'status', 'N/A')}")
            return comp
        else:
            logger.warning(
                "  ⚠️ El PAC no devolvió datos para este UUID o las credenciales requieren ajuste."
            )
            return None

    except Exception as e:
        logger.error(f"  ❌ Error de comunicación con Solución Factible: {e}")
        return None


def consultar_sat_oficial():
    """
    Consulta directa al Web Service oficial de validación del SAT
    (ConsultaCFDIService.svc) usando la expresión impresa oficial.
    """
    logger.info("🏛️ [SAT Oficial] Consultando estatus fiscal directo en el SAT...")
    sat_wsdl = (
        "https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl"
    )

    # Formato exacto del código QR / Expresión impresa del SAT
    expresion = (
        f"?re={RFC_EMISOR}&rr={RFC_RECEPTOR}&tt={TOTAL_FACTURA}&id={UUID_FACTURA}"
    )
    logger.info(f"  • Cadena enviada al SAT: {expresion}")

    try:
        session = requests.Session()
        session.verify = True
        transport = Transport(session=session, timeout=15)
        client = Client(sat_wsdl, transport=transport)

        # Consumo del servicio ConsultaCFDIService
        resultado = client.service.Consulta(expresionImpresa=expresion)

        logger.info("--- ESTATUS REAL OFICIAL DEL SAT ---")
        logger.info(
            f"  • Estado CFDI           : {getattr(resultado, 'Estado', 'N/A')}"
        )
        logger.info(
            f"  • Estatus Cancelación   : {getattr(resultado, 'EstatusCancelacion', 'N/A')}"
        )
        logger.info(
            f"  • Es Cancelable         : {getattr(resultado, 'EsCancelable', 'N/A')}"
        )
        logger.info(
            f"  • Código de Estatus     : {getattr(resultado, 'CodigoEstatus', 'N/A')}"
        )

        return resultado

    except Exception as e:
        logger.error(f"  ❌ Error al conectar con el servidor del SAT: {e}")
        return None


if __name__ == "__main__":
    print("\n===================================================================")
    print("🔍 VERIFICACIÓN DIRECTA DE PAC Y SAT (0% BASE DE DATOS)")
    print("===================================================================\n")

    # 1. Probar comunicación con el PAC (Solución Factible)
    consultar_pac_solucion_factible()

    print("\n-------------------------------------------------------------------\n")

    # 2. Probar comunicación con el SAT Oficial
    consultar_sat_oficial()

    print("\n===================================================================\n")
