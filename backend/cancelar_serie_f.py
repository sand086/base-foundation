import sys
import os
import logging
from datetime import datetime, timezone

# Aseguramos que los imports funcionen en tu entorno
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# --- PARCHE PARA EVITAR ERRORES DE BD ---
import app.integrations.sat.billing_service as bs

bs.register_sat_retry = lambda *args, **kwargs: None
# ----------------------------------------

try:
    from app.models.models import ReceivableInvoice
    from app.db.database import SessionLocal
    from app.integrations.sat.billing_service import BillingService
    from app.integrations.sat.soap_client import create_pac_client
except ImportError as e:
    print(f"Error de importación: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# CONFIGURACIÓN DE LOS UUIDs
UUID_EN_BD = "A3731D16-EB53-484F-9F87-346EC6-AUDIT"
UUID_REAL_SAT = "A3731D16-EB53-484F-9F87-346EC6DEDB7B"
MOTIVO_CANCELACION = "02"


def cancelar_factura_pac():
    db = SessionLocal()
    pac = BillingService(db)

    try:
        with open(pac.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(pac.path_key, "rb") as f_key:
            key_bytes = f_key.read()
    except Exception as e:
        logger.error(f"Error cargando certificados: {e}")
        return

    # Conectamos con el PAC
    logger.info("Conectando con Solución Factible...")
    client_zeep = create_pac_client(pac.wsdl_timbrado, pac.history)

    try:
        # BÚSQUEDA USANDO EL UUID QUE ESTÁ EN LA BD
        factura = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == UUID_EN_BD)
            .first()
        )

        if not factura:
            logger.error(
                f"❌ Sigo sin encontrar la factura en la BD con el UUID {UUID_EN_BD}."
            )
            return

        logger.info(
            f"==> ¡Factura encontrada! Iniciando cancelación en PAC para: {factura.folio_interno}"
        )

        # PERO AL SAT LE MANDAMOS EL UUID REAL
        uuid_formateado_sat = f"{UUID_REAL_SAT}|{MOTIVO_CANCELACION}"

        logger.info(
            f"Enviando petición de cancelación al SAT con el UUID real ({UUID_REAL_SAT})..."
        )
        resultado = client_zeep.service.cancelar(
            usuario=pac.pac_user,
            password=pac.pac_pass,
            uuids=[uuid_formateado_sat],
            derCertCSD=cer_bytes,
            derKeyCSD=key_bytes,
            contrasenaCSD=pac.key_password,
        )

        res_sat = resultado.resultados[0]
        codigo_sat = int(getattr(res_sat, "status", 0))
        mensaje_sat = str(getattr(res_sat, "mensaje", ""))

        logger.info(f"Respuesta PAC: {mensaje_sat} (Código: {codigo_sat})")

        # Evaluamos la respuesta
        if (
            codigo_sat in [201, 202, 211]
            or "proceso" in mensaje_sat.lower()
            or "previamente" in mensaje_sat.lower()
        ):
            factura.estatus = "cancelado"
            factura.status_sat = (
                "CANCELADO"
                if codigo_sat == 202 or "previamente" in mensaje_sat.lower()
                else "PROCESO_CANCELACION"
            )
            factura.fecha_cancelacion = datetime.now(timezone.utc)
            factura.motivo_cancelacion = MOTIVO_CANCELACION
            factura.detalle_sat = mensaje_sat

            db.commit()
            logger.info(
                "✅ ¡ÉXITO! La factura se canceló ante el PAC y la BD local está actualizada."
            )
        else:
            logger.error(
                f"❌ El PAC rechazó la cancelación. Revisa el mensaje de arriba."
            )

    except Exception as e:
        logger.error(f"❌ Error de conexión o ejecución: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    cancelar_factura_pac()
