import logging
from datetime import datetime
from sqlalchemy.orm import Session

try:
    from app.db.database import SessionLocal
except ImportError:
    from app.db.session import SessionLocal

from app.models.models import Trip, ReceivableInvoice
from app.integrations.sat.billing_service import BillingService
from app.modules.logistics.schemas import ReceivableInvoiceCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sustitucion_par_espejo")


def ejecutar_sustitucion_par_espejo():
    db: Session = SessionLocal()
    try:
        viaje_id = 215
        old_nominal_id = 883
        old_commercial_id = 884

        logger.info("=========================================================")
        logger.info("1. VERIFICANDO REGISTROS EN LA BASE DE DATOS")
        logger.info("=========================================================")

        viaje = db.query(Trip).filter(Trip.id == viaje_id).first()
        old_nominal = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.id == old_nominal_id)
            .first()
        )
        old_commercial = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.id == old_commercial_id)
            .first()
        )

        if not viaje or not old_nominal or not old_commercial:
            logger.error(
                "❌ Error: No se encontró el viaje 215 o las facturas originales (883 / 884)."
            )
            return

        old_uuid_nominal = old_nominal.uuid
        old_uuid_commercial = old_commercial.uuid

        logger.info(f"• Viaje ID: {viaje.id}")
        logger.info(
            f"• Carta Porte Nominal Original: ID {old_nominal.id} | Folio: {old_nominal.folio_interno} | UUID: {old_uuid_nominal}"
        )
        logger.info(
            f"• Factura Comercial Original: ID {old_commercial.id} | Folio: {old_commercial.folio_interno} | UUID: {old_uuid_commercial}"
        )

        # ---------------------------------------------------------
        # PASO 1: ACTUALIZAR EL VIAJE A EXPORTACIÓN
        # ---------------------------------------------------------
        logger.info("\n2. CONFIGURANDO VIAJE A 'EXPORTACION'...")
        viaje.tipo_operacion = "exportacion"

        # Ocultamos temporalmente las facturas viejas para que el motor de timbrado
        # no bloquee la creación de nuevos registros para el mismo viaje.
        old_nominal.record_status = "E"
        old_commercial.record_status = "E"
        db.commit()
        logger.info("✅ Viaje 215 actualizado a 'exportacion'.")

        billing_service = BillingService(db)

        # ---------------------------------------------------------
        # PASO 2: TIMBRAR NUEVA CARTA PORTE NOMINAL (CP-18165)
        # ---------------------------------------------------------
        logger.info(
            "\n3. TIMBRANDO NUEVA CARTA PORTE NOMINAL (Folio 18165, Exportación)..."
        )
        payload_nominal = ReceivableInvoiceCreate(
            viaje_id=viaje.id,
            is_nominal=True,
            uuid_relacionado=old_uuid_nominal,
            tipo_relacion="04",  # Sustitución de CFDI previos
            metodo_pago=getattr(old_nominal, "metodo_pago", "PPD") or "PPD",
            forma_pago=getattr(old_nominal, "forma_pago", "99") or "99",
            uso_cfdi="G03",
            folio_forzado=18165,
        )

        nueva_nominal = billing_service.generar_carta_porte_one_shot(payload_nominal)
        logger.info(
            f"✅ ¡Nueva Carta Porte Nominal Timbrada! ID: {nueva_nominal.id} | Folio: {nueva_nominal.folio_interno} | UUID: {nueva_nominal.uuid}"
        )

        # ---------------------------------------------------------
        # PASO 3: TIMBRAR NUEVA FACTURA COMERCIAL (CP-18166)
        # ---------------------------------------------------------
        logger.info(
            "\n4. TIMBRANDO NUEVA FACTURA COMERCIAL (Folio 18166, $44,800.00 MXN)..."
        )
        payload_comercial = ReceivableInvoiceCreate(
            viaje_id=viaje.id,
            is_nominal=False,
            uuid_relacionado=old_uuid_commercial,
            tipo_relacion="04",  # Sustitución de CFDI previos
            metodo_pago=getattr(old_commercial, "metodo_pago", "PPD") or "PPD",
            forma_pago=getattr(old_commercial, "forma_pago", "99") or "99",
            uso_cfdi="G03",
            folio_forzado=18166,
        )

        nueva_comercial = billing_service.generar_carta_porte_one_shot(
            payload_comercial
        )
        logger.info(
            f"✅ ¡Nueva Factura Comercial Timbrada! ID: {nueva_comercial.id} | Folio: {nueva_comercial.folio_interno} | UUID: {nueva_comercial.uuid}"
        )

        # ---------------------------------------------------------
        # PASO 4: RESTAURAR VISIBILIDAD DE HISTORIAL EN BD
        # ---------------------------------------------------------
        old_nominal.record_status = "A"
        old_commercial.record_status = "A"
        db.commit()

        # ---------------------------------------------------------
        # PASO 5: CANCELAR AMBAS FACTURAS EN EL SAT (MOTIVO 01)
        # ---------------------------------------------------------
        logger.info(
            f"\n5. CANCELANDO NOMINAL VIEJA ({old_uuid_nominal}) EN EL SAT (Motivo 01 -> Sustituto: {nueva_nominal.uuid})..."
        )
        res_cancel_nominal = billing_service.cancelar_factura_sat(
            invoice_id=old_nominal_id, motivo="01", uuid_sustituto=nueva_nominal.uuid
        )
        logger.info(f"✅ Respuesta SAT Nominal: {res_cancel_nominal}")

        logger.info(
            f"\n6. CANCELANDO COMERCIAL VIEJA ({old_uuid_commercial}) EN EL SAT (Motivo 01 -> Sustituto: {nueva_comercial.uuid})..."
        )
        res_cancel_commercial = billing_service.cancelar_factura_sat(
            invoice_id=old_commercial_id,
            motivo="01",
            uuid_sustituto=nueva_comercial.uuid,
        )
        logger.info(f"✅ Respuesta SAT Comercial: {res_cancel_commercial}")

        # ---------------------------------------------------------
        # PASO 6: GUARDAR TRAZABILIDAD Y NOTAS DE AUDITORÍA
        # ---------------------------------------------------------
        fecha_canc = datetime.utcnow()

        old_nominal.status_sat = "CANCELADO"
        old_nominal.estatus = "cancelado"
        old_nominal.fecha_cancelacion = fecha_canc
        old_nominal.motivo_cancelacion = "01"
        old_nominal.detalle_sat = f"Cancelada por corrección a Exportación. Sustituida por Nominal ID {nueva_nominal.id} (UUID: {nueva_nominal.uuid})"

        old_commercial.status_sat = "CANCELADO"
        old_commercial.estatus = "cancelado"
        old_commercial.fecha_cancelacion = fecha_canc
        old_commercial.motivo_cancelacion = "01"
        old_commercial.detalle_sat = f"Cancelada por corrección a Exportación. Sustituida por Comercial ID {nueva_comercial.id} (UUID: {nueva_comercial.uuid})"

        db.commit()

        logger.info("=========================================================")
        logger.info("🎉 ¡PROCESO DE SUSTITUCIÓN COMPLETADO CON ÉXITO! 🎉")
        logger.info(
            f"• Nominal Anterior (ID {old_nominal_id}): CANCELADA por Motivo 01. Sustituto: {nueva_nominal.uuid}"
        )
        logger.info(
            f"• Comercial Anterior (ID {old_commercial_id}): CANCELADA por Motivo 01. Sustituto: {nueva_comercial.uuid}"
        )
        logger.info(
            f"• Nueva Nominal (ID {nueva_nominal.id}): {nueva_nominal.folio_interno} VIGENTE."
        )
        logger.info(
            f"• Nueva Comercial (ID {nueva_comercial.id}): {nueva_comercial.folio_interno} VIGENTE."
        )
        logger.info(
            "• Trazabilidad intacta: Todos los registros permanecen visibles en la BD."
        )
        logger.info("=========================================================")

    except Exception as e:
        logger.error(f"❌ Error durante el proceso: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    ejecutar_sustitucion_par_espejo()
