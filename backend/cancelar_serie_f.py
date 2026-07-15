import sys
import os
import logging
from datetime import datetime, timezone

# 1. Aseguramos que los imports del backend funcionen
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.models.models import ReceivableInvoice, InvoiceStatus
    from app.db.database import SessionLocal

    # IMPORTANTE: Aquí importamos tu servicio de SAT/PAC
    from app.integrations.sat.billing_service import SatBillingService
except ImportError as e:
    print(f"Error de importación: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# 2. LISTA EXACTA DE FOLIOS DE A PESO QUE FALTAN DE CANCELAR
FOLIOS_A_CANCELAR = [
    # Folios del 10 de Julio
    "CP-17978",
    "CP-17977",
    "CP-17976",
    "CP-17975",
    "CP-17974",
    "CP-17973",
    "CP-17972",
    "CP-17971",
    "CP-17969",
    "CP-17968",
    "CP-17967",
    "CP-17966",
    # Folios del 09 de Julio
    "CP-17965",
    "CP-17964",
    "CP-17963",
    "CP-17962",
    "CP-17961",
    "CP-17960",
    "CP-17959",
    "CP-17958",
    "CP-17957",
    "CP-17956",
    "CP-17955",
    "CP-17954",
    "CP-17953",
    "CP-17952",
    "CP-17951",
    "CP-17950",
    "CP-17949",
    "CP-17948",
    "CP-17947",
    "CP-17946",
    "CP-17945",
    "CP-17944",
    "CP-17943",
    "CP-17942",
    # Folios rezagados
    "CP-17873",
    "CP-17675",
    "CP-17673",
    "CP-17648",
    "CP-17640",
    "CP-17560",
    "CP-17448",
    "CP-17447",
    "CP-17446",
    "CP-17440",
]


def procesar_cancelaciones():
    db = SessionLocal()

    # AQUÍ ESTABA EL ERROR: Ya está descomentado e instanciado tu servicio real
    pac_service = SatBillingService()

    exitosos = 0
    errores = 0

    try:
        logger.info("Iniciando búsqueda de facturas...")

        # 3. MEGA CANDADO DE SEGURIDAD (Busca por folio, valida fecha, valida monto y nominal)
        facturas = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.folio_interno.in_(FOLIOS_A_CANCELAR),
                ReceivableInvoice.estatus != InvoiceStatus.CANCELADO,
                ReceivableInvoice.fecha_emision
                <= "2026-07-10",  # Solo del 10 para atrás
                ReceivableInvoice.monto_total <= 2.00,  # Exige que sea de a peso
                ReceivableInvoice.is_nominal == True,  # Exige que sea nominal
            )
            .all()
        )

        if not facturas:
            logger.info("No se encontraron facturas basura pendientes en la BD.")
            return

        logger.info(f"¡Se encontraron {len(facturas)} facturas basura para cancelar!")

        for factura in facturas:
            logger.info(
                f"---> Procesando: {factura.folio_interno} | UUID: {factura.uuid} | ${factura.monto_total}"
            )

            # --- VALIDACIÓN DEL VIAJE (REGLA DE ORO) ---
            if factura.viaje_id:
                factura_chida = (
                    db.query(ReceivableInvoice)
                    .filter(
                        ReceivableInvoice.viaje_id == factura.viaje_id,
                        ReceivableInvoice.monto_total > 2.00,
                        ReceivableInvoice.uuid_relacionado != None,
                        ReceivableInvoice.estatus != InvoiceStatus.CANCELADO,
                    )
                    .first()
                )

                if not factura_chida:
                    logger.warning(
                        f"SALTADO: El viaje de {factura.folio_interno} aún no tiene una Factura Chida ligada."
                    )
                    continue

            try:
                # =========================================================
                # LLAMADA REAL A TU PAC
                # =========================================================
                # Si tu servicio requiere pasar la base de datos, cambialo a: pac_service.cancelar_cfdi(db, factura.uuid, "02")
                respuesta = pac_service.cancelar_cfdi(factura.uuid, "02")

                # Si el PAC no arrojó ninguna excepción (error), asumimos que el SAT lo aceptó
                factura.estatus = InvoiceStatus.CANCELADO
                factura.fecha_cancelacion = datetime.now(timezone.utc)
                factura.motivo_cancelacion = "02"
                factura.detalle_sat = (
                    "Cancelación manual por tiempo y duplicidad (No nominal)"
                )

                exitosos += 1
                logger.info(
                    f"EXITO: {factura.folio_interno} cancelada en el PAC y actualizada en BD."
                )

            except Exception as e:
                # Si el PAC rechaza la cancelación (ej. UUID no encontrado, error de red), cae aquí
                logger.error(f"ERROR PAC con {factura.folio_interno}: {str(e)}")
                factura.detalle_sat = f"Error PAC manual: {str(e)}"

                if factura.intentos_cancelacion is None:
                    factura.intentos_cancelacion = 0
                factura.intentos_cancelacion += 1
                errores += 1

        db.commit()
        logger.info(f"--- RESUMEN FINAL: {exitosos} canceladas, {errores} errores ---")

    except Exception as e:
        db.rollback()
        logger.error(f"Error crítico en BD: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    procesar_cancelaciones()
