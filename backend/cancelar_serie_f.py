import sys
import os
import logging
from datetime import datetime, timezone

# 1. Aseguramos que los imports funcionen
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

# LAS 7 FACTURAS REBELDES EXACTAS (6 por Timeout 500 y 1 por Folio Inválido 207)
UUIDS_REINTENTO = [
    "BC6CC157-C3FD-4240-884F-EB7F055A6A63",  # CP-17675
    "84D410C5-F825-4990-B2B5-38E73FB75214",  # CP-17673
    "80F4431B-176B-42D8-B099-3BBC49EFB9EB",  # CP-17978
    "ECD2409A-9214-489A-9E93-A262B6EB5C63",  # CP-17945
    "2E9C5835-81F8-4F60-A5A3-9451A210C2A6",  # CP-17972
    "515AA91C-1A46-4F47-810D-2BB59B40480D",  # CP-17954
    "500D7E5D-B4D8-456F-B457-46B41165733E",  # CP-17948
]


def reintentar_rebeldes():
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

    client_zeep = create_pac_client(pac.wsdl_timbrado, pac.history)

    exitosos = 0
    errores = 0

    try:
        facturas = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid.in_(UUIDS_REINTENTO))
            .all()
        )

        logger.info(
            f"¡Reintentando las {len(facturas)} facturas que fallaron en el SAT!"
        )

        for factura in facturas:
            logger.info(
                f"==> Disparando a: {factura.folio_interno} | UUID: {factura.uuid}"
            )

            # ESTA VEZ FORZAMOS MOTIVO 02
            # El SAT falla al validar las relaciones (01). Con 02 la mata directamente.
            motivo = "02"
            uuid_formateado_sat = f"{factura.uuid.strip()}|{motivo}|"

            try:
                resultado = client_zeep.service.cancelar(
                    usuario=pac.pac_user,
                    password=pac.pac_pass,
                    uuids=[uuid_formateado_sat],
                    derCertCSD=cer_bytes,
                    derKeyCSD=key_bytes,
                    contrasenaCSD=pac.key_password,
                )

                if int(getattr(resultado, "status", 0)) not in [200, 201, 202]:
                    raise Exception(f"Rechazo PAC: {resultado.mensaje}")

                res_sat = resultado.resultados[0]
                codigo_sat = int(getattr(res_sat, "status", 0))
                mensaje_sat = str(getattr(res_sat, "mensaje", "")).lower()

                if (
                    codigo_sat in [201, 202]
                    or "proceso" in mensaje_sat
                    or "previamente cancelado" in mensaje_sat
                ):
                    factura.estatus = "cancelado"
                    factura.status_sat = (
                        "CANCELADO"
                        if codigo_sat == 202 or "previamente" in mensaje_sat
                        else "PROCESO_CANCELACION"
                    )
                    factura.fecha_cancelacion = datetime.now(timezone.utc)
                    factura.motivo_cancelacion = motivo
                    factura.detalle_sat = f"Cancelación SAT Exitosa. Motivo: {motivo}"
                    db.commit()
                    exitosos += 1
                    logger.info(f"    ✅ AHORA SÍ: {mensaje_sat}")
                else:
                    logger.error(f"    ❌ RECHAZO SAT: {res_sat.mensaje}")
                    errores += 1

            except Exception as e:
                logger.error(f"    ❌ ERROR DE CONEXIÓN/TIMEOUT: {str(e)}")
                errores += 1

        logger.info(
            f"--- RESUMEN FINAL REINTENTO: {exitosos} canceladas ante el SAT, {errores} errores ---"
        )

    except Exception as e:
        logger.error(f"Error crítico: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    reintentar_rebeldes()
