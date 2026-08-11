import os
import sys
import logging
import requests
from zeep import Client
from zeep.transports import Transport

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger("VERIFICADOR_SAT_PAC")

# ─────────────────────────────────────────────────────────────────────────────
# 1. DATOS EXACTOS DE LA FACTURA CP-18166
# ─────────────────────────────────────────────────────────────────────────────
RFC_EMISOR = "RTX110624KP5"  # RAPIDOS 3T
RFC_RECEPTOR = "HMG980427Q42"  # Receptor de la factura
UUID_FACTURA = "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35"
TOTAL_FACTURA = "44800.00"

# ─────────────────────────────────────────────────────────────────────────────
# 2. CREDENCIALES DEL PAC
# ─────────────────────────────────────────────────────────────────────────────
PAC_USER = "trafico2@3t.com.mx"
PAC_PASS = "iMbm2Z49.2_"
PAC_WSDL = "https://solucionfactible.com/ws/services/Timbrado?wsdl"


def consultar_pac_solucion_factible():
    logger.info("📡 [PAC Solución Factible] Consultando el comprobante...")
    try:
        transport = Transport(timeout=15)
        client = Client(PAC_WSDL, transport=transport)

        resultado = client.service.obtenerDatos(
            usuario=PAC_USER,
            password=PAC_PASS,
            uuid=UUID_FACTURA,
            folio=None,
            serie=None,
        )

        status_code = int(getattr(resultado, "status", 0))
        mensaje = getattr(resultado, "mensaje", "")

        if (
            status_code == 200
            and hasattr(resultado, "comprobantes")
            and resultado.comprobantes
        ):
            comp = resultado.comprobantes[0]
            logger.info("--- DATOS DEL COMPROBANTE EN EL PAC ---")
            logger.info(
                f"  • Serie/Folio : {getattr(comp, 'nombreSerie', '')}-{getattr(comp, 'folio', '')}"
            )
            logger.info(f"  • Cliente     : {getattr(comp, 'nombreCliente', 'N/A')}")
            logger.info(f"  • Total       : ${getattr(comp, 'importeTotal', 0.0)}")
            logger.info(f"  • Estatus PAC : {getattr(comp, 'status', 'N/A')}")
        else:
            logger.warning(f"  ⚠️ Respuesta PAC: Status {status_code} - {mensaje}")

    except Exception as e:
        logger.error(f"  ❌ Error PAC: {e}")


def consultar_sat_oficial():
    logger.info("🏛️ [SAT Oficial] Consultando estatus fiscal directo en el SAT...")
    sat_wsdl = (
        "https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl"
    )

    # Cadena exacta que exige el SAT para consultar un CFDI
    expresion = (
        f"?re={RFC_EMISOR}&rr={RFC_RECEPTOR}&tt={TOTAL_FACTURA}&id={UUID_FACTURA}"
    )
    logger.info(f"  • Expresión SAT: {expresion}")

    try:
        session = requests.Session()
        session.verify = True
        transport = Transport(session=session, timeout=15)
        client = Client(sat_wsdl, transport=transport)

        resultado = client.service.Consulta(expresionImpresa=expresion)

        logger.info("--- ESTATUS REAL OFICIAL DEL SAT ---")
        logger.info(f"  • Estado CFDI         : {getattr(resultado, 'Estado', 'N/A')}")
        logger.info(
            f"  • Estatus Cancelación : {getattr(resultado, 'EstatusCancelacion', 'N/A')}"
        )
        logger.info(
            f"  • Es Cancelable       : {getattr(resultado, 'EsCancelable', 'N/A')}"
        )
        logger.info(
            f"  • Código Respuesta    : {getattr(resultado, 'CodigoEstatus', 'N/A')}"
        )

    except Exception as e:
        logger.error(f"  ❌ Error SAT: {e}")


if __name__ == "__main__":
    print("\n===================================================================")
    print(f"🔍 VERIFICACIÓN DIRECTA DE LA FACTURA CP-18166")
    print("===================================================================\n")

    consultar_pac_solucion_factible()
    print("\n-------------------------------------------------------------------\n")
    consultar_sat_oficial()
    print("\n===================================================================\n")
