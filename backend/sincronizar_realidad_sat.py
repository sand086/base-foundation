import sys
import os
import logging
from datetime import datetime, timezone, timedelta

# Aseguramos que los imports funcionen en tu entorno
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# --- PARCHE PARA EVITAR ERRORES DE BASE DE DATOS LOCAL ---
try:
    import app.integrations.sat.billing_service as bs

    bs.register_sat_retry = lambda *args, **kwargs: None
except:
    pass

try:
    from app.models.models import ReceivableInvoice
    from app.db.database import SessionLocal
    from app.integrations.sat.billing_service import BillingService
    from app.integrations.sat.soap_client import create_pac_client
except ImportError as e:
    print(f"Error de importación: {e}")
    sys.exit(1)

# ─── CONFIGURACIÓN DE LOGS INDEPENDIENTES ────────────────────────────────
# Log General (Consola / Salida estándar para el cron)
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# Log Especializado de Errores (Va a un archivo dedicado exclusivamente)
PATH_ERR_LOG = (
    "/home/desarrolloas/base-foundation/backend/scripts/errores_cancelacion.log"
)
os.makedirs(os.path.dirname(PATH_ERR_LOG), exist_ok=True)

error_logger = logging.getLogger("ErrorLogger")
error_logger.setLevel(logging.ERROR)
file_handler = logging.FileHandler(PATH_ERR_LOG, encoding="utf-8")
file_handler.setFormatter(logging.Formatter("[%(asctime)s] %(message)s"))
error_logger.addHandler(file_handler)
# ─────────────────────────────────────────────────────────────────────────


def verificar_y_forzar_cancelaciones():
    db = SessionLocal()
    # Ventana móvil de los últimos 7 días para validar cambios recientes de estatus
    fecha_limite = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

    logger.info(
        f"🔎 Buscando facturas locales con estatus 'cancelado' desde el {fecha_limite}..."
    )

    try:
        # Buscamos CUALQUIER tipo de factura (CP, COM, F) que localmente esté cancelada
        facturas_canceladas_local = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.updated_at >= fecha_limite,
                ReceivableInvoice.estatus == "cancelado",
            )
            .all()
        )

        if not facturas_canceladas_local:
            logger.info(
                "Everything clean! No hay cancelaciones locales recientes que verificar."
            )
            return

        pac = BillingService(db)
        client_zeep = create_pac_client(pac.wsdl_timbrado, pac.history)

        for factura in facturas_canceladas_local:
            if not factura.uuid:
                continue

            try:
                # 1. Consultamos el estatus real directo en el Web Service del SAT
                # Nota: Si tu BillingService usa otro nombre (ej. 'consultar_estatus'), cámbialo aquí
                resultado_sat = pac.consultar_estatus_sat(factura.uuid)
                estado_sat = (
                    resultado_sat.get("estado", "")
                    if isinstance(resultado_sat, dict)
                    else str(resultado_sat)
                )

                # 2. Si en nuestra BD dice cancelada, pero el SAT dice que sigue VIGENTE, actuamos:
                if "vigente" in estado_sat.lower():
                    logger.info(
                        f"⚠️ DISCREPANCIA DETECTADA: {factura.folio_interno} está VIGENTE en el SAT pero CANCELADA localmente."
                    )
                    logger.info(
                        f"🚀 Forzando petición de cancelación real ante el SAT..."
                    )

                    # Usamos Motivo 02 (Con errores sin relación) para poder cancelarla directo sin sustituto
                    uuid_formateado = f"{factura.uuid.strip()}|02"

                    with open(pac.path_cer, "rb") as f_cer:
                        cer_bytes = f_cer.read()
                    with open(pac.path_key, "rb") as f_key:
                        key_bytes = f_key.read()

                    resultado_cancelacion = client_zeep.service.cancelar(
                        usuario=pac.pac_user,
                        password=pac.pac_pass,
                        uuids=[uuid_formateado],
                        derCertCSD=cer_bytes,
                        derKeyCSD=key_bytes,
                        contrasenaCSD=pac.key_password,
                    )

                    res_sat = resultado_cancelacion.resultados[0]
                    codigo_sat = int(getattr(res_sat, "status", 0))
                    mensaje_sat = str(getattr(res_sat, "mensaje", ""))

                    if (
                        codigo_sat in [201, 202, 211]
                        or "proceso" in mensaje_sat.lower()
                        or "previamente" in mensaje_sat.lower()
                    ):
                        factura.status_sat = (
                            "CANCELADO" if codigo_sat == 202 else "PROCESO_CANCELACION"
                        )
                        factura.detalle_sat = f"Cancelación forzada exitosa por el sincronizador: {mensaje_sat}"
                        db.commit()
                        logger.info(
                            f"✅ ¡Éxito! El SAT aceptó la cancelación forzada para {factura.folio_interno}."
                        )
                    else:
                        # Si el SAT rechaza la cancelación forzada, guardamos el error en el archivo separado
                        error_msg = f"ERROR DE CANCELACIÓN FORZADA en {factura.folio_interno} ({factura.uuid}): El SAT/PAC rechazó la solicitud. Respuesta: {mensaje_sat} (Código: {codigo_sat})"
                        logger.error(
                            f"❌ Error crítico guardado en bitácora independiente."
                        )
                        error_logger.error(error_msg)

            except Exception as e:
                # Si truena la consulta o la red, el error se va directo al archivo aislado
                error_msg = f"FALLA DE CONEXIÓN/EJECUCIÓN en {factura.folio_interno} ({factura.uuid}): {str(e)}"
                logger.error(
                    f"❌ Falla de comunicación guardada en bitácora independiente."
                )
                error_logger.error(error_msg)

    except Exception as e:
        error_logger.error(
            f"Error general en el ciclo del script sincronizar_realidad_sat: {str(e)}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    verificar_y_forzar_cancelaciones()
