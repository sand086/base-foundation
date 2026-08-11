import os
import sys
import logging
from zeep import Client
from zeep.transports import Transport
from zeep.plugins import HistoryPlugin

# Configuración de Logs limpia en pantalla
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("PRUEBA_CANCELAR_ASINCRONO")

# ─────────────────────────────────────────────────────────────────────────────
# 1. DATOS REALES DE LA FACTURA A CONSULTAR / CANCELAR
# ─────────────────────────────────────────────────────────────────────────────
RFC_EMISOR = "RTX110624KP5"  # RAPIDOS 3T
UUID_FACTURA = "0872026F-B4A3-4773-ACAC-6B4E710F8D0D"  # CP-17661
MOTIVO_CANCELACION = "02"  # 02 = Comprobante emitido con errores sin relación

# ─────────────────────────────────────────────────────────────────────────────
# 2. CREDENCIALES Y ENDPOINT (Usa producción si quieres ver el estatus real)
# ─────────────────────────────────────────────────────────────────────────────
PAC_USER = os.getenv("PAC_USER", "tu_usuario_pac@3t.com.mx")
PAC_PASS = os.getenv("PAC_PASS", "tu_password_pac")

# Endpoint según la documentación enviada:
# Producción
PAC_WSDL = os.getenv(
    "PAC_WSDL", "https://solucionfactible.com/ws/services/Cancelacion?wsdl"
)
# Pruebas:
# PAC_WSDL = os.getenv("PAC_WSDL", "https://testing.solucionfactible.com/ws/services/Cancelacion?wsdl")


def probar_cancelacion_asincrona():
    """
    Consume el método 'cancelacionAsincrona' del WebService de Cancelación
    de Solución Factible sin tocar la base de datos.
    """
    logger.info("📡 [PAC Solución Factible] Preparando solicitud cancelarAsincrono...")

    # Formato obligatorio SAT 2022: UUID|Motivo|UuidSustitucion
    cadena_uuid = f"{UUID_FACTURA}|{MOTIVO_CANCELACION}|"
    logger.info(f"  • Cadena enviada al PAC: {cadena_uuid}")

    try:
        history = HistoryPlugin()
        transport = Transport(timeout=20)
        client = Client(PAC_WSDL, transport=transport, plugins=[history])

        # Llamada directa al Web Service de Cancelación
        # Según la documentación, si el CSD ya está en el panel, se omiten: csdCer, csdKey, csdPassword
        resultado = client.service.cancelacionAsincrona(
            user=PAC_USER,
            pass_=PAC_PASS,  # En Zeep a veces el parámetro 'pass' se renombra a 'pass_' por ser palabra reservada en Python
            uuid=cadena_uuid,
            rfcEmisor=RFC_EMISOR,
            emailNotifica="trafico2@3t.com.mx",  # Opcional
        )

        status_code = int(getattr(resultado, "status", 0))
        mensaje = getattr(resultado, "mensaje", "")

        logger.info("\n--- RESPUESTA OFICIAL DE SOLUCIÓN FACTIBLE ---")
        logger.info(f"  • Código de Respuesta (status) : {status_code}")
        logger.info(f"  • Mensaje del SAT / ID         : {mensaje}")

        # Interpretación del código según la documentación proporcionada
        if status_code == 200:
            logger.info(
                "  ✅ [200] La solicitud de cancelación se registró exitosamente."
            )
        elif status_code == 305:
            logger.error(
                "  ❌ [305] La fecha de cancelación no está dentro de la vigencia del CSD."
            )
        elif status_code == 500:
            logger.error("  ❌ [500] Errores internos (reintentar).")
        elif status_code == 601:
            logger.error(
                "  ❌ [601] Error de autenticación (usuario/password incorrecto)."
            )
        elif status_code == 701:
            logger.warning(
                "  ⚠️ [701] Ya existe una transacción asíncrona para este UUID."
            )
        else:
            logger.warning(f"  ⚠️ Código desconocido en documentación: {status_code}")

        # Si requieres ver el XML crudo descomenta estas líneas
        # logger.info("\n--- XML ENVIADO ---")
        # logger.info(history.last_sent['envelope'].decode('utf-8'))
        # logger.info("\n--- XML RECIBIDO ---")
        # logger.info(history.last_received['envelope'].decode('utf-8'))

    except Exception as e:
        logger.error(f"  ❌ Error de comunicación con el Endpoint: {e}")
        # Si el error es de TypeError por el nombre del parámetro password
        if "pass_" in str(e):
            logger.error(
                "     Tip: Intenta cambiar 'pass_=' por 'password=' en la llamada a client.service."
            )


if __name__ == "__main__":
    print("\n===================================================================")
    print("🚀 TEST DE CANCELACIÓN ASÍNCRONA (ENDPOINT SOLUCIÓN FACTIBLE)")
    print("===================================================================\n")

    probar_cancelacion_asincrona()

    print("\n===================================================================\n")
