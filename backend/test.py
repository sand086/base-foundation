import os
import logging
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

# El UUID que quieres consultar (El que nos devolvió el PAC en el paso anterior)
UUID_TRANSACCION = "0872026F-B4A3-4773-ACAC-6B4E710F8D0D"

# URL EXACTA DEL WSDL DE CANCELACIÓN
PAC_WSDL = "https://solucionfactible.com/ws/services/Cancelacion?wsdl"


def obtener_status_cancelacion():
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

        # OJO: Los nombres de los parámetros deben coincidir con la documentación:
        # 'usuario', 'password', 'transactionId' (o 'uuid' en el XML de ejemplo)
        # Probaremos con user/pass/uuid como dicta el ejemplo XML de su web.
        resultado = client.service.getStatusCancelacionAsincrona(
            user=PAC_USER,
            pass_=PAC_PASS,  # Zeep usa pass_ en lugar de pass
            uuid=UUID_TRANSACCION,
        )

        status_code = getattr(resultado, "status", None)
        mensaje = getattr(resultado, "mensaje", None)
        acuse_sat = getattr(resultado, "acuseSAT", None)

        logger.info("\n🟢 RESPUESTA PARSEADA DEL PAC:")
        logger.info(f"   Status HTTP : {status_code}")
        logger.info(f"   Mensaje     : {mensaje}")

        if acuse_sat:
            logger.info("   📜 ¡Acuse del SAT disponible! (Base64)")
            # Descomenta esto si quieres imprimir la cadena Base64 inmensa
            # logger.info(f"   Acuse Base64: {acuse_sat[:100]}... [Truncado]")
        else:
            logger.info("   📜 Acuse SAT : No disponible aún o vacío.")

        # Interpretación rápida basada en la documentación oficial
        logger.info("\n--- INTERPRETACIÓN OFICIAL ---")
        if status_code == 200:
            logger.info(
                "✅ 200: La solicitud de cancelación se registró exitosamente y/o está completada."
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
        else:
            logger.warning(
                f"ℹ️ Código {status_code}: Revisa la tabla de errores en la documentación."
            )

    except Exception as e:
        logger.error(f"\n❌ Excepción durante la llamada SOAP: {e}")

        # En caso de error por nombres de parámetros (ej: si el WSDL pedía "usuario" en vez de "user")
        if "pass_" in str(e) or "uuid" in str(e):
            logger.error(
                "Tip: Intenta cambiar los parámetros en la línea 46. Ej: usuario=PAC_USER, password=PAC_PASS, transactionId=UUID_TRANSACCION"
            )

    finally:
        # AQUI SE IMPRIMEN LOS XMLs DE RED PARA VER EL DETALLE EXACTO
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
    obtener_status_cancelacion()
