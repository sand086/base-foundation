import logging
import time
from datetime import datetime
from sqlalchemy.orm import Session

try:
    from app.db.database import SessionLocal
except ImportError:
    from app.db.session import SessionLocal

from app.models.models import ReceivableInvoice
from app.integrations.sat.billing_service import BillingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cancelacion_forzada")


def ejecutar_cancelacion_exacta():
    db: Session = SessionLocal()
    try:
        # IDs exactos según tu base de datos
        id_padre_nominal = 883
        id_hijo_comercial = 884

        logger.info("=========================================================")
        logger.info(
            f"1. BUSCANDO FACTURAS POR ID: {id_padre_nominal} y {id_hijo_comercial}"
        )
        logger.info("=========================================================")

        # Búsqueda estricta por ID
        factura_padre = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.id == id_padre_nominal)
            .first()
        )
        factura_hijo = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.id == id_hijo_comercial)
            .first()
        )

        if not factura_padre or not factura_hijo:
            logger.error("❌ Error: No se encontraron las facturas en la BD.")
            return

        # Validamos los UUIDs en consola para estar 100% seguros
        logger.info(
            f"• PADRE ENCONTRADO: ID {factura_padre.id} | UUID: {factura_padre.uuid} (Debe ser E274FF8D...)"
        )
        logger.info(
            f"• HIJO ENCONTRADO: ID {factura_hijo.id} | UUID: {factura_hijo.uuid} (Debe ser AFD65A3C...)"
        )

        billing_service = BillingService(db)

        # ---------------------------------------------------------
        # PASO 1: CANCELAR LA COMERCIAL (884)
        # ---------------------------------------------------------
        logger.info(
            "\n2. CANCELANDO FACTURA COMERCIAL (HIJO - ID 884) EN EL SAT (Motivo 02)..."
        )
        res_cancel_hijo = billing_service.cancelar_factura_sat(
            invoice_id=factura_hijo.id, motivo="02"
        )
        logger.info(f"✅ Respuesta SAT Comercial: {res_cancel_hijo}")

        # ---------------------------------------------------------
        # PASO 2: TIEMPO DE GRACIA PARA EL SAT
        # ---------------------------------------------------------
        logger.info(
            "\n⏳ Esperando 20 segundos para que el SAT procese y libere el UUID Padre..."
        )
        time.sleep(20)

        # ---------------------------------------------------------
        # PASO 3: CANCELAR LA NOMINAL (883)
        # ---------------------------------------------------------
        logger.info(
            "\n3. CANCELANDO CARTA PORTE NOMINAL (PADRE - ID 883) EN EL SAT (Motivo 02)..."
        )
        res_cancel_padre = billing_service.cancelar_factura_sat(
            invoice_id=factura_padre.id, motivo="02"
        )
        logger.info(f"✅ Respuesta SAT Nominal: {res_cancel_padre}")

        # ---------------------------------------------------------
        # PASO 4: ACTUALIZACIÓN EN BD
        # ---------------------------------------------------------
        logger.info("\n4. ACTUALIZANDO ESTATUS EN LA BASE DE DATOS...")
        fecha_canc = datetime.utcnow()

        factura_hijo.status_sat = "CANCELADO"
        factura_hijo.estatus = "cancelado"
        factura_hijo.fecha_cancelacion = fecha_canc
        factura_hijo.motivo_cancelacion = "02"
        factura_hijo.detalle_sat = "Cancelada exitosamente (Motivo 02)."

        factura_padre.status_sat = "CANCELADO"
        factura_padre.estatus = "cancelado"
        factura_padre.fecha_cancelacion = fecha_canc
        factura_padre.motivo_cancelacion = "02"
        factura_padre.detalle_sat = (
            "Cancelada exitosamente tras liberar al hijo (Motivo 02)."
        )

        db.commit()

        logger.info("=========================================================")
        logger.info("🎉 ¡AMBAS FACTURAS FUERON CANCELADAS CORRECTAMENTE! 🎉")
        logger.info("=========================================================")

    except Exception as e:
        logger.error(f"❌ Error crítico: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    ejecutar_cancelacion_exacta()
