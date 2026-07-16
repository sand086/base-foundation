import sys
import os
import logging
from datetime import datetime, timezone, timedelta

# Aseguramos que los imports funcionen
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# --- PARCHE PARA EVITAR ERRORES DE BD (Solo si es necesario) ---
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

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# =========================================================================
# ⚠️ CONTROL DE EJECUCIÓN REAL
# True = Se conecta al PAC y ejecuta las cancelaciones reales ante el SAT
# =========================================================================
EJECUTAR_CANCELACION = True


def auditar_y_limpiar():
    db = SessionLocal()

    # Rango dinámico móvil de 3 días para proteger el rendimiento de la BD
    fecha_limite = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d")

    try:
        logger.info(
            f"🔎 Analizando duplicados creados dinámicamente desde el: {fecha_limite}..."
        )

        # 1. FILTROS ESTRICTOS: Traemos CPs activas de 3 días, nominales=True y total=1.00
        facturas_recientes = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.created_at >= fecha_limite,
                ReceivableInvoice.estatus != "cancelado",
                ReceivableInvoice.folio_interno.like("CP-%"),
                ReceivableInvoice.is_nominal == True,
                ReceivableInvoice.total == 1.00,
            )
            .all()
        )

        viajes_dict = {}
        for fac in facturas_recientes:
            viaje_id = getattr(fac, "viaje_id", None)
            if viaje_id:
                if viaje_id not in viajes_dict:
                    viajes_dict[viaje_id] = []
                viajes_dict[viaje_id].append(fac)

        logger.info("-" * 60)
        logger.info(
            "📋 REPORTE DE DUPLICIDAD EN CARTAS PORTE (FILTRADO: $1.00 + NOMINAL)"
        )
        logger.info("-" * 60)

        facturas_a_cancelar = []

        for viaje_id, lista_facturas in viajes_dict.items():
            if len(lista_facturas) > 1:
                # Ordenamos por ID descendente. La de ID más alto (la última creada) se queda como la Chida
                lista_facturas.sort(key=lambda x: x.id, reverse=True)

                factura_chida = lista_facturas[0]
                facturas_viejas = lista_facturas[1:]

                logger.info(
                    f"🚀 Viaje [{viaje_id}] detectó {len(lista_facturas)} CPs de a peso vigentes."
                )
                logger.info(
                    f"   ✅ SE QUEDA (Factura Chida): {factura_chida.folio_interno} | {factura_chida.uuid}"
                )

                for vieja in facturas_viejas:
                    # CORREGIDO: Usamos estricta y limpiamente la variable 'vieja'
                    logger.info(
                        f"   ❌ A CANCELAR: {vieja.folio_interno} | {vieja.uuid}"
                    )
                    facturas_a_cancelar.append({"viaje": vieja, "chida": factura_chida})

        logger.info("-" * 60)
        logger.info(
            f"Total de facturas basura filtradas en este ciclo: {len(facturas_a_cancelar)}"
        )

        if len(facturas_a_cancelar) == 0:
            logger.info(
                "¡Todo limpio! No se encontraron duplicados que cumplan los criterios."
            )
            return

        if EJECUTAR_CANCELACION:
            ejecutar_bajas_sat(db, facturas_a_cancelar)

    except Exception as e:
        logger.error(f"Error en la auditoría: {e}")
    finally:
        db.close()


def ejecutar_bajas_sat(db, facturas_a_cancelar):
    logger.info("\n🔥 INICIANDO PROCESO DE CANCELACIÓN EN EL SAT...")
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

    for pareja in facturas_a_cancelar:
        viaje = pareja["viaje"]
        chida = pareja["chida"]

        logger.info(
            f"Enviando cancelación para {viaje.folio_interno} (Motivo 01) -> Sustituye: {chida.uuid}"
        )
        uuid_formateado = f"{viaje.uuid.strip()}|01|{chida.uuid.strip()}"

        try:
            resultado = client_zeep.service.cancelar(
                usuario=pac.pac_user,
                password=pac.pac_pass,
                uuids=[uuid_formateado],
                derCertCSD=cer_bytes,
                derKeyCSD=key_bytes,
                contrasenaCSD=pac.key_password,
            )

            res_sat = resultado.resultados[0]
            codigo_sat = int(getattr(res_sat, "status", 0))
            mensaje_sat = str(getattr(res_sat, "mensaje", "")).lower()

            if (
                codigo_sat in [201, 202, 211]
                or "proceso" in mensaje_sat
                or "previamente" in mensaje_sat
            ):
                viaje.estatus = "cancelado"
                viaje.status_sat = (
                    "CANCELADO"
                    if codigo_sat == 202 or "previamente" in mensaje_sat
                    else "PROCESO_CANCELACION"
                )
                viaje.fecha_cancelacion = datetime.now(timezone.utc)
                viaje.motivo_cancelacion = "01"
                viaje.detalle_sat = f"Sustituida por: {chida.uuid}"
                db.commit()
                exitosos += 1
                logger.info("   ✅ SAT Aceptó la petición.")
            else:
                logger.error(
                    f"   ❌ SAT {viaje.folio_interno} Rechazó: {res_sat.mensaje}. Se reintentará en el próximo ciclo cron."
                )

        except Exception as e:
            logger.error(
                f"   ❌ Error de comunicación con el PAC para {viaje.folio_interno}: {e}. Se queda en cola."
            )

    logger.info(
        f"\n--- RESUMEN DE PROCESAMIENTO: {exitosos} exitosas de {len(facturas_a_cancelar)} procesadas ---"
    )


if __name__ == "__main__":
    auditar_y_limpiar()
