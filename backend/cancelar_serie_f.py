import sys
import os
import logging

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("consulta_relacionados")

# ====================================================================
# 🔧 CONFIGURA AQUÍ EL UUID QUE QUIERES INVESTIGAR Y SU RECEPTOR
# ====================================================================
UUID_A_CONSULTAR = "26D54643-486C-4FD3-89CC-79D7226494B1"
RFC_RECEPTOR = "CAL860822RL8"  # Necesario por validación del SAT
# ====================================================================


def consultar_cfdi_relacionados():
    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        # Leer Certificados de la empresa (CSD)
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        logger.info(f"Conectando al PAC: {service.wsdl_timbrado}")
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        logger.info(
            f"Consultando documentos relacionados para el UUID: {UUID_A_CONSULTAR}"
        )

        # Solución Factible expone el método consultarRelacionados
        # Requiere firmar la petición con el CSD, igual que la cancelación
        resultado = client_zeep.service.consultarRelacionados(
            usuario=service.pac_user,
            password=service.pac_pass,
            uuid=UUID_A_CONSULTAR,
            rfcReceptor=RFC_RECEPTOR,  # A veces el PAC requiere validar el receptor
            derCertCSD=cer_bytes,
            derKeyCSD=key_bytes,
            contrasenaCSD=service.key_password,
        )

        print("\n" + "=" * 70)
        print(f"📊 RESULTADO DE LA CONSULTA PARA: {UUID_A_CONSULTAR}")
        print("=" * 70)

        # 1. Verificamos el estatus de la petición
        status = getattr(resultado, "status", "S/S")
        mensaje = getattr(resultado, "mensaje", "Sin mensaje")
        print(f"Status SAT: {status} | Mensaje: {mensaje}")
        print("-" * 70)

        # 2. Extraemos los UUIDs relacionados (Los "Hijos" que bloquean la cancelación)
        if hasattr(resultado, "uuidsRelacionados") and resultado.uuidsRelacionados:
            hijos = resultado.uuidsRelacionados.uuid
            print(
                f"⚠️ ATENCIÓN: Se encontraron {len(hijos)} documento(s) relacionados activos:"
            )
            for hijo in hijos:
                print(f" 🚫 UUID Bloqueante: {hijo}")

            print(
                "\n💡 ACCIÓN: Debes cancelar primero los UUIDs listados arriba antes de poder cancelar la Carta Porte."
            )
        else:
            print(
                "✅ No se encontraron documentos relacionados activos en la respuesta."
            )

            # Imprimimos la respuesta cruda por si el PAC devuelve la estructura diferente
            print("\nRespuesta cruda del PAC para depuración:")
            print(resultado)

    except Exception as e:
        logger.error(f"❌ Ocurrió un error al consultar: {e}")
        logger.info(
            "🔍 TIP: Si el error dice que el método no existe, ejecuta 'python -m zeep https://solucionfactible.com/ws/services/Timbrado?wsdl' en tu consola para ver el nombre exacto del método en Solución Factible."
        )
    finally:
        db.close()
        logger.info("Proceso terminado. Conexión cerrada.")


if __name__ == "__main__":
    consultar_cfdi_relacionados()
