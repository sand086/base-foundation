import sys
import os
import logging
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoice
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("reintento_final")


def cancelar_uuid_rebelde():
    db = SessionLocal()
    service = PaymentComplementService(db)

    # La Carta Porte que se resistía
    target_uuid = "BE6CF903-F5DC-4692-925B-045B1771ABC2"

    # Formato Motivo 02 (Cancelación sin relación)
    param_cancelacion = f"{target_uuid}|02|"

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        logger.info(
            f"🚀 Enviando a cancelar Carta Porte rebelde con MOTIVO 02: {target_uuid}"
        )

        resultado = client_zeep.service.cancelar(
            usuario=service.pac_user,
            password=service.pac_pass,
            uuids=[param_cancelacion],
            derCertCSD=cer_bytes,
            derKeyCSD=key_bytes,
            contrasenaCSD=service.key_password,
        )

        res_sat = resultado.resultados[0]
        codigo = getattr(res_sat, "status", 0)
        mensaje = str(getattr(res_sat, "mensaje", "")).lower()

        logger.info(f"📡 Respuesta SAT -> Código: {codigo} | Mensaje: {mensaje}")

        # Actualización en BD Local
        factura = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == target_uuid)
            .first()
        )
        if factura:
            if (
                codigo in [201, 202, 211]
                or "proceso" in mensaje
                or "previamente" in mensaje
                or "exito" in mensaje
            ):
                factura.status_sat = (
                    "PROCESO_CANCELACION"
                    if codigo != 202 and "previamente" not in mensaje
                    else "CANCELADO"
                )
                factura.estatus = "cancelado"
                factura.saldo_pendiente = 0.0
                factura.detalle_sat = f"SAT (Motivo 02): {mensaje}"
                factura.fecha_cancelacion = datetime.utcnow()
                db.commit()
                logger.info(
                    f"✅ ¡ÉXITO! Base de datos actualizada a {factura.estatus}."
                )
            else:
                factura.detalle_sat = f"Rechazo Motivo 02: {mensaje}"
                db.commit()
                logger.warning("⚠️ SAT rechazó la petición. Revisa el mensaje arriba.")
        else:
            logger.error("❌ Factura no encontrada en la BD.")

    except Exception as e:
        logger.error(f"❌ Error crítico ejecutando la petición: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    cancelar_uuid_rebelde()
