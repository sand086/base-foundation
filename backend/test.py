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
    "E376D2FC-DFAC-47A4-BF96-1F967E4E2FA1",
    "15C3915D-63F8-4A6B-B215-A417A8E71672",
    "35641205-3B6E-41A5-8768-76DAFD361AA5",
    "E5D9A238-8C00-4D31-8506-D014564C6DF1",
    "637C4C6B-8656-4D3F-81FD-E3CAB9EED207",
    "13823C08-1668-400D-B113-9A20DBA4EB8A",
    "7445D9F3-0FD8-4258-836D-E0F01E7A9F2A",
    "F4830BB2-C67D-49FC-846D-E5A613C2CB08",
    "F34AC46D-AF5B-48D8-A1D6-742AFEDDCA4B",
    "B196EFE4-2170-40E9-BC99-B96824781121",
    "C11127D3-D498-41E7-81AA-16025AC40DFB",
    "2C529061-CBF8-498D-AE86-767D87BBE1FD",
    "4FC71DD4-E66C-41D2-9BDD-34BDCF5A2495",
    "3EFDA751-DAD0-4B44-8005-EB1FFC75F7C2",
    "8E51461A-9FEF-4452-96FD-BAE026B1719F",
    "9215013E-AEC3-4ABB-8BB9-423C4C9C7570",
    "CBED2935-7F81-4DEB-B26F-6093E06DCED2",
    "E48FEB83-E11F-477A-B9AB-65EA84C8101B",
    "EA9D045A-BF25-4132-B314-7C275AEC5A9D",
    "3BA79113-20D3-43E5-9BF3-CFEFBE6D7D6C",
    "57D89083-2887-4EC6-8E8C-CFDEA0541C71",
    "0826E309-7C61-488C-8628-96069558B563",
    "750C712D-7DDB-4F06-B1F4-29E564155D32",
    "BBFB78E3-D960-49AF-9A5E-A876B474D962",
    "89474C8C-FDAC-4A0B-890F-0B915D66A513",
    "AA2FFEBD-5CC3-42ED-AFD7-9017253A1E28",
    "3C81534F-C65F-4245-BE90-3127B10CBA31",
    "CB771797-B8B8-45A0-A115-32BBEB7AA5B8",
    "E53258D5-9011-42C7-A1D2-16263DB5361F",
    "9A3EFAEB-4BE4-4428-B146-FF43ACB24DBF",
    "3D26A393-07BC-4B0F-B761-DBC82B54CF7D",
    "6054E1BE-C706-4426-9F69-3FEEC70D15ED",
    "FD1C3C2E-92BD-4206-B980-8CBB7C398EED",
    "42182F68-42B2-4CEA-ABF2-10426766B15B",
    "5B881674-5695-403F-91CA-938B64C128EE",
    "1E64CC95-043E-477F-9EAE-463068A64344",
    "FC3767B6-CFAB-48EC-B50D-8D26B6601EB6",
    "6893C9DA-A64D-4937-BB42-C3D36A49EB24",
    "AF0BCC30-7736-4744-9C5F-E79632054D5D",
    "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF",
    "7DB87625-E8FE-4026-AC3D-AB61647B0B25",
    "E5E6964B-07C2-4365-9BD4-B6677DF35ED3",
    "49100456-EF69-458B-84B5-8A20F5389BB0",
    "2624E912-4210-46B4-86C1-AC9AEBA9E604",
    "75834706-6320-4E26-BABA-3B3A7C8AF4AC",
    "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3",
    "0E72BD82-8253-481D-80B2-35E0F8919E06",
    "15DE708D-0643-4E3A-BABD-F72B59C20753",
    "3A1624D8-BE6D-4653-BEAB-616A808982FC",
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
