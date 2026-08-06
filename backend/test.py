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
logger = logging.getLogger("cancelacion_bloqueadas_m01")

# =====================================================================
# 📌 LISTA DE BLOQUEADAS Y SUS SUSTITUTOS (MOTIVO 01)
# Estructura: (UUID_A_CANCELAR, UUID_SUSTITUTO_CHIDO)
# =====================================================================
PAREJAS_BLOQUEADAS = [
    ("E48FEB83-E11F-477A-B9AB-65EA84C8101B", "053133D5-1620-4843-8A36-FE2A4799830E"),
    ("BE6CF903-F5DC-4692-925B-045B1771ABC2", "49100456-EF69-458B-84B5-8A20F5389BB0"),
    ("89474C8C-FDAC-4A0B-890F-0B915D66A513", "FA9FD203-1A5D-4A9A-8181-0E80D7EC6392"),
    ("2C529061-CBF8-498D-AE86-767D87BBE1FD", "31E39A79-C1DA-47DA-9279-365D8B021793"),
]


def destrabar_bloqueadas():
    db = SessionLocal()
    service = PaymentComplementService(db)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_destrabadas_m01_{timestamp}.csv"

    logger.info(
        f"🚀 Iniciando proceso para destrabar {len(PAREJAS_BLOQUEADAS)} UUIDs con Motivo 01..."
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
                    "UUID_Viejo",
                    "UUID_Sustituto",
                    "Status_SAT",
                    "Mensaje_SAT",
                    "Estatus_BD",
                ]
            )

            for uuid_viejo, uuid_nuevo in PAREJAS_BLOQUEADAS:
                # Formato SAT para Motivo 01: UUID_VIEJO|01|UUID_NUEVO
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

                    factura_bd = (
                        db.query(ReceivableInvoice)
                        .filter(ReceivableInvoice.uuid == uuid_viejo)
                        .first()
                    )
                    estatus_bd = "NO_ENCONTRADA"

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
                            factura_bd.detalle_sat = f"Cancelada Motivo 01 (Sustituida por {uuid_nuevo}): {mensaje}"
                            factura_bd.fecha_cancelacion = datetime.utcnow()
                            db.commit()
                            estatus_bd = f"ACTUALIZADA ({factura_bd.estatus})"
                            logger.info(
                                f"   ✅ ÉXITO: {mensaje} -> BD como {factura_bd.estatus}"
                            )
                        else:
                            factura_bd.detalle_sat = f"Rechazo Motivo 01: {mensaje}"
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

                time.sleep(2)

        logger.info(f"\n📁 Proceso finalizado. Evidencia guardada en: {csv_filename}")

    except Exception as e_gen:
        logger.error(f"❌ Error crítico: {e_gen}")
    finally:
        db.close()


if __name__ == "__main__":
    destrabar_bloqueadas()
