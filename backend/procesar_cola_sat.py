import sys
import os
import logging

# 1. Aseguramos que el script pueda encontrar los módulos de 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoicePayment

# 2. Configuración del logger para que el Cron guarde el output
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cron_sat_queue")


def procesar_cola():
    logger.info("Iniciando auditoría de pagos REP pendientes/conciliación...")
    db = SessionLocal()

    try:
        # Seguridad fiscal: este cron ya no retimbra REPs automáticamente.
        # Un timeout puede haber generado UUID en el PAC aunque la app no lo haya visto.
        pagos_pendientes = (
            db.query(ReceivableInvoicePayment)
            .filter(
                (ReceivableInvoicePayment.complemento_uuid == "PENDIENTE_SAT")
                | (ReceivableInvoicePayment.estatus == "CONCILIACION_REQUERIDA")
            )
            .all()
        )

        if not pagos_pendientes:
            logger.info("No hay pagos REP pendientes de conciliación.")
            return

        folios_pendientes = list(
            set(p.folio_complemento for p in pagos_pendientes if p.folio_complemento)
        )

        logger.info(
            "Se encontraron %s lotes REP pendientes de conciliación. "
            "No se reintentará timbrado automático.",
            len(folios_pendientes),
        )

        for folio in folios_pendientes:
            logger.warning("Lote REP requiere revisión manual: %s", folio)

    except Exception as e:
        logger.error(f"Error crítico conectando a la BD en procesar_cola_sat: {e}")
    finally:
        # 6. Siempre cerramos la sesión para no agotar el pool
        db.close()
        logger.info("Escaneo finalizado. Conexión cerrada.")


if __name__ == "__main__":
    procesar_cola()
