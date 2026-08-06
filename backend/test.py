import sys
import os
import logging
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoicePayment
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("matar_ultimo_rep")


def cancelar_rep_rebelde():
    db = SessionLocal()
    service = PaymentComplementService(db)

    # El REP secuestrador
    uuid_rep = "554C256A-F77E-44CB-A635-D231EB1D2148"
    param = f"{uuid_rep}|02|"

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        logger.info(f"🔪 Enviando petición al SAT para matar el REP: {uuid_rep}")

        resultado = client_zeep.service.cancelar(
            usuario=service.pac_user,
            password=service.pac_pass,
            uuids=[param],
            derCertCSD=cer_bytes,
            derKeyCSD=key_bytes,
            contrasenaCSD=service.key_password,
        )

        res_sat = resultado.resultados[0]
        codigo = getattr(res_sat, "status", 0)
        mensaje = str(getattr(res_sat, "mensaje", "")).lower()

        logger.info(f"📡 Respuesta SAT -> Código: {codigo} | Mensaje: {mensaje}")

        # Actualizar en BD local (Registro ID 182)
        pago = (
            db.query(ReceivableInvoicePayment)
            .filter(ReceivableInvoicePayment.id == 182)
            .first()
        )
        if pago:
            if (
                codigo in [201, 202, 211]
                or "proceso" in mensaje
                or "previamente" in mensaje
                or "exito" in mensaje
            ):
                pago.estatus = "cancelado"
                pago.motivo_cancelacion = "02"
                pago.detalle_sat = f"SAT: {mensaje}"
                pago.fecha_cancelacion = datetime.utcnow()
                db.commit()
                logger.info("✅ ¡ÉXITO! Registro ID 182 actualizado a 'cancelado'.")
            else:
                pago.detalle_sat = f"Rechazo: {mensaje}"
                db.commit()
                logger.warning("⚠️ SAT rechazó la cancelación del REP.")
        else:
            logger.error("❌ No se encontró el registro ID 182 en la BD.")

    except Exception as e:
        logger.error(f"❌ Error crítico: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    cancelar_rep_rebelde()
