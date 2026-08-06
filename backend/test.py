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
logger = logging.getLogger("cancelacion_motivo01_cp")

# =====================================================================
# 📌 PAREJAS DE SUSTITUCCIÓN (UUID_VIEJO_CP_UN_PESO | 01 | UUID_FACTURA_CHIDA)
# =====================================================================
PAREJAS_A_CANCELAR = [
    # (UUID_VIEJO_CP_UN_PESO , UUID_FACTURA_CHIDA_SUSTITUTA)
    ("3EFDA751-DAD0-4B44-8005-EB1FFC75F7C2", "DA0D965B-6C80-4CE3-9770-7D4EB9ECF83B"),
    ("BE6CF903-F5DC-4692-925B-045B1771ABC2", "49100456-EF69-458B-84B5-8A20F5389BB0"),
    ("3A4F7A92-8245-45FA-9F5C-DC8281A5E432", "E5E6964B-07C2-4365-9BD4-B6677DF35ED3"),
    ("2C529061-CBF8-498D-AE86-767D87BBE1FD", "31E39A79-C1DA-47DA-9279-365D8B021793"),
    ("75834706-6320-4E26-BABA-3B3A7C8AF4AC", "B2E2B407-563B-42DB-939C-0548B05F981F"),
    ("A7BD2256-A76E-4D3B-8771-31863EFDA81A", "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF"),
    ("3BA79113-20D3-43E5-9BF3-CFEFBE6D7D6C", "0B9B62F0-750E-45AA-8047-B5FF0CF3B12C"),
    ("3C81534F-C65F-4245-BE90-3127B10CBA31", "4F70ED02-3503-438D-995A-44DABD9187A5"),
    ("89474C8C-FDAC-4A0B-890F-0B915D66A513", "FA9FD203-1A5D-4A9A-8181-0E80D7EC6392"),
    ("AA2FFEBD-5CC3-42ED-AFD7-9017253A1E28", "DD22F58A-0831-40B3-87AB-4F2F0B0430F7"),
    ("E53258D5-9011-42C7-A1D2-16263DB5361F", "3DE591D1-B2E9-484E-BAC8-8BFF9EC8DF78"),
    ("83D726BC-40A0-4688-BE2A-E5ECE56812E5", "2624E912-4210-46B4-86C1-AC9AEBA9E604"),
    ("CB771797-B8B8-45A0-A115-32BBEB7AA5B8", "1B827D22-3C25-4E7E-BD92-2D925B25771D"),
    ("E48FEB83-E11F-477A-B9AB-65EA84C8101B", "053133D5-1620-4843-8A36-FE2A4799830E"),
    ("9215013E-AEC3-4ABB-8BB9-423C4C9C7570", "E26E9F38-FBEB-40DA-AC05-6907076CB061"),
]


def disparar_cancelacion_motivo01():
    db = SessionLocal()
    service = PaymentComplementService(db)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_cancelacion_cp_m01_{timestamp}.csv"

    logger.info(
        f"🚀 Cancelando {len(PAREJAS_A_CANCELAR)} Cartas Porte con MOTIVO 01 y relacionando a la factura chida..."
    )

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(
                [
                    "UUID_Viejo_CP",
                    "UUID_Nuevo_Chido",
                    "Status_SAT",
                    "Mensaje_SAT",
                    "Estatus_BD",
                ]
            )

            for uuid_viejo, uuid_nuevo in PAREJAS_A_CANCELAR:
                # Estructura del SAT: UUID_VIEJO|01|UUID_NUEVO
                param = f"{uuid_viejo}|01|{uuid_nuevo}"
                logger.info(f"🔪 Enviando: {uuid_viejo} (Motivo 01 -> {uuid_nuevo})")

                try:
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

                    # Actualizar en BD solo la Carta Porte vieja
                    factura_vieja = (
                        db.query(ReceivableInvoice)
                        .filter(ReceivableInvoice.uuid == uuid_viejo)
                        .first()
                    )
                    estatus_bd = "NO_ENCONTRADA"

                    if factura_vieja:
                        if (
                            codigo in [201, 202, 211]
                            or "proceso" in mensaje
                            or "previamente" in mensaje
                            or "exito" in mensaje
                        ):
                            factura_vieja.status_sat = (
                                "PROCESO_CANCELACION"
                                if codigo != 202 and "previamente" not in mensaje
                                else "CANCELADO"
                            )
                            factura_vieja.estatus = "cancelado"
                            factura_vieja.saldo_pendiente = 0.0
                            factura_vieja.detalle_sat = f"Cancelada Motivo 01 (Sustituida por {uuid_nuevo}): {mensaje}"
                            factura_vieja.fecha_cancelacion = datetime.utcnow()
                            db.commit()
                            estatus_bd = f"ACTUALIZADA ({factura_vieja.estatus})"
                            logger.info(
                                f"   ✅ ÉXITO: {mensaje} -> BD como {factura_vieja.estatus}"
                            )
                        else:
                            factura_vieja.detalle_sat = f"Rechazo Motivo 01: {mensaje}"
                            db.commit()
                            estatus_bd = "RECHAZO SAT"
                            logger.warning(f"   ⚠️ RECHAZO SAT: {mensaje}")

                    writer.writerow(
                        [uuid_viejo, uuid_nuevo, codigo, mensaje, estatus_bd]
                    )

                except Exception as e_peticion:
                    logger.error(f"   ❌ Error enviando {uuid_viejo}: {e_peticion}")
                    writer.writerow(
                        [
                            uuid_viejo,
                            uuid_nuevo,
                            "ERROR",
                            str(e_peticion),
                            "SIN_CAMBIOS",
                        ]
                    )

                time.sleep(1.5)  # Pausa estratégica para no saturar al PAC

        logger.info(f"\n📁 Proceso finalizado. Evidencia guardada en: {csv_filename}")

    except Exception as e_gen:
        logger.error(f"❌ Error crítico: {e_gen}")
    finally:
        db.close()


if __name__ == "__main__":
    disparar_cancelacion_motivo01()
