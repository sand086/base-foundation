import os
import sys
import csv
import logging
import requests
from datetime import datetime
from zeep import Client as ZeepClient
from zeep.transports import Transport

# Asegurar que el script encuentre la app para importar la BD
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoice, ReceivableInvoicePayment, Client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("AUDITORIA_DB")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────────────────────────────────────
PAC_USER = "trafico2@3t.com.mx"
PAC_PASS = "iMbm2Z49.2_"
RFC_EMISOR = "RTX110624KP5"

PAC_WSDL = "https://solucionfactible.com/ws/services/Cancelacion?wsdl"
SAT_WSDL = (
    "https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl"
)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
REPORTE_PAC = f"auditoria_pac_{timestamp}.csv"
REPORTE_SAT = f"auditoria_sat_{timestamp}.csv"


def extraer_comprobantes_db():
    """Extrae todas las facturas y pagos de la BD con UUID válido"""
    logger.info("📦 Conectando a la Base de Datos para extraer comprobantes...")
    db = SessionLocal()
    comprobantes = []

    try:
        # 1. Extraer Facturas (Ingresos, Egresos, Traslados)
        facturas = (
            db.query(ReceivableInvoice)
            .join(Client)
            .filter(ReceivableInvoice.uuid.isnot(None), ReceivableInvoice.uuid != "")
            .all()
        )

        for f in facturas:
            comprobantes.append(
                {
                    "tipo": "FACTURA/CARTA_PORTE",
                    "id_interno": f.id,
                    "uuid": str(f.uuid).strip().upper(),
                    "rfc_receptor": str(f.client.rfc).strip().upper(),
                    "total": str(f.monto_total),
                }
            )

        # 2. Extraer Complementos de Pago
        pagos = (
            db.query(ReceivableInvoicePayment)
            .join(ReceivableInvoice)
            .join(Client)
            .filter(
                ReceivableInvoicePayment.complemento_uuid.isnot(None),
                ReceivableInvoicePayment.complemento_uuid != "",
            )
            .all()
        )

        for p in pagos:
            comprobantes.append(
                {
                    "tipo": "COMPLEMENTO_PAGO",
                    "id_interno": p.id,
                    "uuid": str(p.complemento_uuid).strip().upper(),
                    "rfc_receptor": str(p.invoice.client.rfc).strip().upper(),
                    "total": str(p.monto),  # El SAT usa el monto del pago
                }
            )

        logger.info(f"✅ Se extrajeron {len(facturas)} Facturas y {len(pagos)} Pagos.")
        logger.info(f"📊 Total a auditar: {len(comprobantes)} comprobantes.")
        return comprobantes

    except Exception as e:
        logger.error(f"❌ Error al consultar la BD: {e}")
        return []
    finally:
        db.close()


def ejecutar_auditoria():
    comprobantes = extraer_comprobantes_db()

    if not comprobantes:
        logger.warning("⚠️ No hay comprobantes para auditar. Terminando.")
        return

    logger.info("🌐 Preparando conexiones a SAT y Solución Factible...")
    session = requests.Session()
    session.verify = True
    transport_sat = Transport(session=session, timeout=15)
    transport_pac = Transport(timeout=15)

    try:
        client_sat = ZeepClient(SAT_WSDL, transport=transport_sat)
        client_pac = ZeepClient(PAC_WSDL, transport=transport_pac)
    except Exception as e:
        logger.error(f"❌ Error al levantar los Web Services: {e}")
        return

    logger.info(f"📝 Creando archivos de reporte: {REPORTE_PAC} y {REPORTE_SAT}")
    with open(REPORTE_PAC, mode="w", newline="", encoding="utf-8") as f_pac, open(
        REPORTE_SAT, mode="w", newline="", encoding="utf-8"
    ) as f_sat:

        pac_writer = csv.writer(f_pac)
        sat_writer = csv.writer(f_sat)

        # Encabezados
        pac_writer.writerow(
            ["Tipo_Documento", "ID_Interno_BD", "UUID", "Status_PAC", "Mensaje_PAC"]
        )
        sat_writer.writerow(
            [
                "Tipo_Documento",
                "ID_Interno_BD",
                "UUID",
                "RFC_Receptor",
                "Total",
                "Estado_CFDI",
                "Estatus_Cancelacion",
                "Es_Cancelable",
            ]
        )

        for idx, comp in enumerate(comprobantes, 1):
            tipo = comp["tipo"]
            id_int = comp["id_interno"]
            uuid = comp["uuid"]
            rfc_rec = comp["rfc_receptor"]
            total = comp["total"]

            logger.info(f"[{idx}/{len(comprobantes)}] Auditando UUID: {uuid} ...")

            # ---------------------------------------------------------
            # 1. CONSULTA PAC (getStatusCancelacionAsincrona)
            # ---------------------------------------------------------
            status_pac = "Error"
            mensaje_pac = "No consultado"
            try:
                res_pac = client_pac.service.getStatusCancelacionAsincrona(
                    usuario=PAC_USER, password=PAC_PASS, transactionId=uuid
                )
                status_pac = str(getattr(res_pac, "status", "N/A"))
                mensaje_pac = str(getattr(res_pac, "mensaje", "N/A"))
            except Exception as e:
                logger.error(f"  ❌ Error PAC en UUID {uuid}: {e}")

            pac_writer.writerow([tipo, id_int, uuid, status_pac, mensaje_pac])

            # ---------------------------------------------------------
            # 2. CONSULTA SAT
            # ---------------------------------------------------------
            estado_sat = "Error"
            estatus_canc_sat = "Error"
            cancelable_sat = "Error"

            expresion_sat = f"?re={RFC_EMISOR}&rr={rfc_rec}&tt={total}&id={uuid}"

            try:
                res_sat = client_sat.service.Consulta(expresionImpresa=expresion_sat)
                estado_sat = str(getattr(res_sat, "Estado", "N/A"))
                estatus_canc_sat = str(getattr(res_sat, "EstatusCancelacion", "N/A"))
                cancelable_sat = str(getattr(res_sat, "EsCancelable", "N/A"))
            except Exception as e:
                logger.error(f"  ❌ Error SAT en UUID {uuid}: {e}")

            sat_writer.writerow(
                [
                    tipo,
                    id_int,
                    uuid,
                    rfc_rec,
                    total,
                    estado_sat,
                    estatus_canc_sat,
                    cancelable_sat,
                ]
            )

    logger.info("\n===================================================================")
    logger.info("🎉 ¡AUDITORÍA FINALIZADA CON ÉXITO!")
    logger.info(f"📁 Reporte PAC : {REPORTE_PAC}")
    logger.info(f"📁 Reporte SAT : {REPORTE_SAT}")
    logger.info("Ya puedes descargar estos archivos para analizarlos.")
    logger.info("===================================================================")


if __name__ == "__main__":
    ejecutar_auditoria()
