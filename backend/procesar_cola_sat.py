import sys
import os
import logging

# 1. Aseguramos que el script pueda encontrar los módulos de 'app'
# Esto es vital para los scripts que corren por Cron fuera del contexto de FastAPI
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.models import ReceivableInvoicePayment
from app.integrations.sat.payment_service import PaymentComplementService

# 2. Configuración del logger para que el Cron guarde el output
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cron_sat_queue")


def procesar_cola():
    logger.info("Iniciando escaneo de pagos PENDIENTES_SAT...")
    db = SessionLocal()

    try:
        # 3. Buscar todos los pagos que se quedaron colgados por intermitencias
        pagos_pendientes = (
            db.query(ReceivableInvoicePayment)
            .filter(ReceivableInvoicePayment.complemento_uuid == "PENDIENTE_SAT")
            .all()
        )

        if not pagos_pendientes:
            logger.info("La cola está vacía. No hay pagos pendientes.")
            return

        logger.info(
            f"Se encontraron {len(pagos_pendientes)} pagos en cola. Iniciando reintentos..."
        )

        # 4. Instanciar tu servicio de pagos
        payment_service = PaymentComplementService(db)

        # 5. Iterar y procesar cada pago
        for pago in pagos_pendientes:
            try:
                logger.info(
                    f"-> Reintentando timbrado para Pago ID {pago.id} (Factura: {pago.invoice_id})"
                )

                # Llamamos a la función que ya parchamos en la Fase 2
                payment_service.timbrar_pago_existente(payment_id=pago.id, user_id=1)

                logger.info(f"✅ ÉXITO: Pago {pago.id} timbrado correctamente.")

            except Exception as e:
                # Si falla, no rompemos el ciclo. El parche que hicimos en payment_service.py
                # ya se encargó de pasarlo a "RECHAZADO_SAT" si fue error de negocio,
                # o dejarlo en "PENDIENTE_SAT" si volvió a ser Timeout.
                logger.error(f"❌ FALLO en Pago {pago.id}: {e}")

    except Exception as e:
        logger.error(f"Error crítico conectando a la BD en procesar_cola_sat: {e}")
    finally:
        # 6. Siempre cerramos la sesión para no agotar el pool de conexiones
        db.close()
        logger.info("Escaneo finalizado. Conexión cerrada.")


if __name__ == "__main__":
    procesar_cola()
