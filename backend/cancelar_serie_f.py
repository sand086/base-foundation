import sys
import os
import logging
from datetime import datetime, timezone

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
# ⚠️ MODO DE EJECUCIÓN
# False = Solo imprime en consola lo que encontró (Seguro)
# True = Se conecta al PAC y dispara la cancelación al SAT (Irreversible)
# =========================================================================
EJECUTAR_CANCELACION = False


def auditar_y_limpiar():
    db = SessionLocal()
    fecha_inicio = "2026-07-10"

    try:
        # 1. Buscamos todas las CP activas desde el 10 de julio
        logger.info(f"🔎 Buscando facturas activas creadas desde el {fecha_inicio}...")
        facturas_recientes = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.created_at >= fecha_inicio,
                ReceivableInvoice.estatus != "cancelado",
                ReceivableInvoice.folio_interno.like("CP-%"),
            )
            .all()
        )

        # 2. Agrupamos por el ID del viaje
        # NOTA: Asumo que la columna se llama 'viaje_id'. Cámbiala si en tu modelo se llama distinto (ej. 'shipment_id', 'order_id')
        viajes_dict = {}
        for fac in facturas_recientes:
            viaje_id = getattr(fac, "viaje_id", None)
            if viaje_id:
                if viaje_id not in viajes_dict:
                    viajes_dict[viaje_id] = []
                viajes_dict[viaje_id].append(fac)

        logger.info("-" * 60)
        logger.info("📋 REPORTE DE DUPLICIDAD POR VIAJE")
        logger.info("-" * 60)

        facturas_a_cancelar = []

        # 3. Analizamos qué viajes tienen más de 1 CP viva
        for viaje_id, lista_facturas in viajes_dict.items():
            if len(lista_facturas) > 1:
                # Ordenamos por ID descendente. La de ID más alto (la más nueva) será la "Chida"
                lista_facturas.sort(key=lambda x: x.id, reverse=True)

                factura_chida = lista_facturas[0]
                facturas_viejas = lista_facturas[1:]

                logger.info(
                    f"🚀 Viaje [{viaje_id}] tiene {len(lista_facturas)} CPs activas."
                )
                logger.info(
                    f"   ✅ SE QUEDA (Factura Chida): {factura_chida.folio_interno} | {factura_chida.uuid}"
                )

                for vieja in facturas_viejas:
                    logger.info(
                        f"   ❌ A CANCELAR: {vieja.folio_interno} | {vieja.uuid}"
                    )
                    facturas_a_cancelar.append({"vieja": vieja, "chida": factura_chida})

        logger.info("-" * 60)
        logger.info(f"Total de facturas basura detectadas: {len(facturas_a_cancelar)}")

        if len(facturas_a_cancelar) == 0:
            logger.info(
                "¡Todo está limpio! No hay facturas vigentes duplicadas para cancelar."
            )
            return

        # 4. Fase de Ejecución (Solo si EJECUTAR_CANCELACION es True)
        if EJECUTAR_CANCELACION:
            ejecutar_bajas_sat(db, facturas_a_cancelar)
        else:
            logger.info("\n⚠️ MODO SIMULACIÓN ACTIVO.")
            logger.info(
                "Para cancelar estas facturas en el SAT, cambia 'EJECUTAR_CANCELACION = True' en el script."
            )

    except Exception as e:
        logger.error(f"Error en la auditoría: {e}")
    finally:
        db.close()


def ejecutar_bajas_sat(db, facturas_a_cancelar):
    logger.info("\n🔥 INICIANDO CANCELACIÓN MASIVA EN EL SAT...")
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
        vieja = pareja["vieja"]
        chida = pareja["chida"]

        logger.info(
            f"Disparando a {vieja.folio_interno} usando Motivo 01 -> {chida.uuid}"
        )

        uuid_formateado = f"{vieja.uuid.strip()}|01|{chida.uuid.strip()}"

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
                vieja.estatus = "cancelado"
                vieja.status_sat = (
                    "CANCELADO" if codigo_sat == 202 else "PROCESO_CANCELACION"
                )
                vieja.fecha_cancelacion = datetime.now(timezone.utc)
                vieja.motivo_cancelacion = "01"
                vieja.detalle_sat = f"Sustituida por: {chida.uuid}"
                db.commit()
                exitosos += 1
                logger.info("   ✅ SAT Aceptó.")
            else:
                logger.error(f"   ❌ SAT Rechazó: {res_sat.mensaje}")

        except Exception as e:
            logger.error(f"   ❌ Error de conexión: {e}")

    logger.info(
        f"--- CANCELACIÓN TERMINADA: {exitosos} exitosas de {len(facturas_a_cancelar)} ---"
    )


if __name__ == "__main__":
    auditar_y_limpiar()
