import sys
import os
import logging
import csv
import time
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
logger = logging.getLogger("limpieza_cp_un_peso")

# =====================================================================
# 📌 LISTADO EXTRAÍDO DEL SAT: CARTAS PORTE CON IMPORTE $1.12
# =====================================================================
UUIDS_CP_UN_PESO = [
    "E48FEB83-E11F-477A-B9AB-65EA84C8101B",
    "637C4C6B-8656-4D3F-81FD-E3CAB9EED207",
    "CABD5CFC-21C3-46C5-9D8F-4A06D5E686AB",
    "89474C8C-FDAC-4A0B-890F-0B915D66A513",
    "BE6CF903-F5DC-4692-925B-045B1771ABC2",
    "2C529061-CBF8-498D-AE86-767D87BBE1FD",
]


def limpiar_cartas_porte_de_viajes():
    db = SessionLocal()
    service = PaymentComplementService(db)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_limpieza_unpeso_{timestamp}.csv"

    logger.info("🔍 Analizando viajes para las Cartas Porte de $1.12...")

    # 1. Rastrear los viajes (viaje_id) a partir de los UUIDs de un peso
    viajes_afectados = set()
    for uuid in UUIDS_CP_UN_PESO:
        factura_peso = (
            db.query(ReceivableInvoice).filter(ReceivableInvoice.uuid == uuid).first()
        )
        if factura_peso and factura_peso.viaje_id:
            viajes_afectados.add(factura_peso.viaje_id)

    logger.info(
        f"📍 Se encontraron {len(viajes_afectados)} viajes únicos involucrados en BD."
    )

    # 2. Buscar TODAS las Cartas Porte que pertenezcan a esos viajes (y no estén canceladas)
    uuids_a_cancelar_final = set()
    for viaje_id in viajes_afectados:
        # Se buscan facturas activas de esos viajes.
        facturas_del_viaje = (
            db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.viaje_id == viaje_id,
                ReceivableInvoice.estatus != "cancelado",  # Que sigan vivas en BD
            )
            .all()
        )

        for f in facturas_del_viaje:
            # Agregamos formato de cancelación SAT: "UUID|02|"
            uuids_a_cancelar_final.add(f"{f.uuid}|02|")

    # Si por alguna razón los UUID originales no estaban en BD pero queremos asegurarnos de mandarlos:
    for u in UUIDS_CP_UN_PESO:
        uuids_a_cancelar_final.add(f"{u}|02|")

    logger.info(
        f"💣 Total de comprobantes a matar (incluyendo derivadas del mismo viaje): {len(uuids_a_cancelar_final)}"
    )

    if not uuids_a_cancelar_final:
        logger.info("No hay nada que cancelar. Todas ya estaban muertas.")
        db.close()
        return

    # 3. Proceder con la cancelación
    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(
                ["UUID_Cancelado", "Status_SAT", "Mensaje_SAT", "Estatus_BD"]
            )

            for param_cancelacion in list(uuids_a_cancelar_final):
                uuid_puro = param_cancelacion.split("|")[0]
                logger.info(f"Enviando al SAT: {uuid_puro}")

                try:
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

                    factura_bd = (
                        db.query(ReceivableInvoice)
                        .filter(ReceivableInvoice.uuid == uuid_puro)
                        .first()
                    )
                    estatus_bd = "NO_ENCONTRADA_EN_BD"

                    if factura_bd:
                        if (
                            codigo in [201, 202, 211]
                            or "proceso" in mensaje
                            or "previamente" in mensaje
                            or "exito" in mensaje
                        ):
                            factura_bd.status_sat = (
                                "PROCESO_CANCELACION"
                                if codigo != 202 and "previamente" not in mensaje
                                else "CANCELADO"
                            )
                            factura_bd.estatus = "cancelado"
                            factura_bd.saldo_pendiente = 0.0
                            factura_bd.detalle_sat = f"SAT: {mensaje}"
                            factura_bd.fecha_cancelacion = datetime.utcnow()
                            db.commit()
                            estatus_bd = f"ACTUALIZADA ({factura_bd.estatus})"
                        else:
                            factura_bd.detalle_sat = f"Rechazo: {mensaje}"
                            db.commit()
                            estatus_bd = "RECHAZO SAT"

                    writer.writerow([uuid_puro, codigo, mensaje, estatus_bd])

                except Exception as e_peticion:
                    logger.error(f"Error con {uuid_puro}: {str(e_peticion)}")
                    writer.writerow(
                        [uuid_puro, "ERROR", str(e_peticion), "SIN_CAMBIOS"]
                    )

                time.sleep(1)  # Respiro para el PAC

        logger.info(f"✅ Proceso finalizado. Evidencia guardada en {csv_filename}")

    except Exception as e_general:
        logger.error(f"❌ Error crítico en configuración: {e_general}")
    finally:
        db.close()


if __name__ == "__main__":
    limpiar_cartas_porte_de_viajes()
