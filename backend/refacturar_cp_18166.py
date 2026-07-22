import logging
from sqlalchemy.orm import Session

try:
    from app.db.database import SessionLocal
except ImportError:
    from app.db.session import SessionLocal

from app.models.models import Trip, ReceivableInvoice
from app.integrations.sat.billing_service import BillingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fix_pdf_938")


def regenerar_pdf_factura_938():
    db: Session = SessionLocal()
    try:
        viaje_id = 215
        invoice_id = 938

        logger.info("=========================================================")
        logger.info("1. CONFIGURANDO VIAJE 215 A 'EXPORTACION'")
        logger.info("=========================================================")

        viaje = db.query(Trip).filter(Trip.id == viaje_id).first()
        if viaje:
            viaje.tipo_operacion = "exportacion"
            db.commit()
            logger.info("✅ Viaje 215 actualizado a 'exportacion' en la BD local.")
        else:
            logger.error("❌ No se encontró el viaje 215.")
            return

        logger.info("\n2. REDIBUJANDO PDF DE LA FACTURA 938 (CP-18166)...")
        billing_service = BillingService(db)

        # Se toma el XML guardado en disco de la factura 938 y se pasa por el HTML corregido
        resultado = billing_service.regenerar_pdf_factura(invoice_id)

        logger.info("=========================================================")
        logger.info("🎉 ¡PDF DE LA FACTURA 938 REGENERADO CON ÉXITO! 🎉")
        logger.info(f"• ID Factura: {invoice_id}")
        logger.info("• Folio Interno: CP-18166")
        logger.info("• UUID SAT: C22E9512-593B-408E-96D0-51816C1EBBFE")
        logger.info("• Origen Físico: Punto de Carga / Cliente (Frialsa)")
        logger.info("• Destino Físico: Punto de Entrega / Rápidos 3T (Veracruz)")
        logger.info("• Timbres consumidos: 0")
        logger.info("=========================================================")

    except Exception as e:
        logger.error(f"❌ Error durante el proceso: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    regenerar_pdf_factura_938()
