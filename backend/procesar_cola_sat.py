import sys
import os
import logging

# 1. Aseguramos que el script pueda encontrar los módulos de 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
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
        # 3. Buscar todos los pagos que se quedaron colgados
        pagos_pendientes = (
            db.query(ReceivableInvoicePayment)
            .filter(ReceivableInvoicePayment.complemento_uuid == "PENDIENTE_SAT")
            .all()
        )

        if not pagos_pendientes:
            logger.info("La cola está vacía. No hay pagos pendientes.")
            return

        # =====================================================================
        # 🛠️ AGRUPACIÓN: Obtenemos los folios únicos (ej. COM-2643) para procesar en lote
        # =====================================================================
        folios_pendientes = list(
            set(p.folio_complemento for p in pagos_pendientes if p.folio_complemento)
        )

        logger.info(
            f"Se encontraron {len(folios_pendientes)} lotes (folios) en cola. Iniciando reintentos..."
        )

        # 4. Instanciar tu servicio de pagos
        payment_service = PaymentComplementService(db)

        # 5. Iterar y procesar cada FOLIO en lugar de cada pago individual
        for folio in folios_pendientes:
            try:
                logger.info(
                    f"-> Reintentando timbrado para Lote de Pagos (Folio: {folio})"
                )

                # Llamamos a la función actualizada que recibe el folio completo
                payment_service.timbrar_pago_existente(
                    folio_complemento=folio, user_id=1
                )

                logger.info(f"✅ ÉXITO: Lote {folio} timbrado correctamente.")

            except Exception as e:
                logger.error(f"❌ FALLO en Lote {folio}: {e}")

    except Exception as e:
        logger.error(f"Error crítico conectando a la BD en procesar_cola_sat: {e}")
    finally:
        # 6. Siempre cerramos la sesión para no agotar el pool
        db.close()
        logger.info("Escaneo finalizado. Conexión cerrada.")


if __name__ == "__main__":
    procesar_cola()
