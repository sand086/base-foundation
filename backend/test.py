import sys
import os
import pandas as pd
import logging
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
logger = logging.getLogger("excel_pac_match")

INPUT_EXCEL = "libro_status_PAC_2026_ago.xlsx"
OUTPUT_EXCEL = "libro_status_PAC_2026_ago_ACTUALIZADO.xlsx"


def ejecutar_match_excel():
    if not os.path.exists(INPUT_EXCEL):
        logger.error(f"❌ No se encontró el archivo de entrada: {INPUT_EXCEL}")
        return

    logger.info(f"📊 Cargando archivo Excel: {INPUT_EXCEL}...")
    df = pd.read_excel(INPUT_EXCEL)

    # Asegurar que existan las columnas de destino
    if "STATUS_SAT" not in df.columns:
        df["STATUS_SAT"] = ""
    if "ACUSE_CANCELACION" not in df.columns:
        df["ACUSE_CANCELACION"] = ""

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        total_rows = len(df)
        logger.info(f"🔍 Procesando match para {total_rows} registros...")

        for idx, row in df.iterrows():
            uuid = str(row["TFD UUID"]).strip().upper()

            # Si el registro no tiene UUID válido, saltar
            if not uuid or uuid == "NAN" or len(uuid) < 30:
                continue

            # Buscar información en la Base de Datos Local primero
            factura_bd = (
                db.query(ReceivableInvoice)
                .filter(ReceivableInvoice.uuid == uuid)
                .first()
            )

            if factura_bd:
                df.at[idx, "CANCELADO"] = factura_bd.estatus == "cancelado"
                if factura_bd.fecha_cancelacion:
                    df.at[idx, "FECHA CANCELACION"] = factura_bd.fecha_cancelacion
                if factura_bd.status_sat:
                    df.at[idx, "STATUS_SAT"] = factura_bd.status_sat
                if factura_bd.detalle_sat:
                    df.at[idx, "ACUSE_CANCELACION"] = factura_bd.detalle_sat

            # Si en Excel no está marcado como cancelado, hacer la verificación directa con el PAC
            if not df.at[idx, "CANCELADO"]:
                try:
                    # Petición de estado al PAC
                    param = f"{uuid}|02|"
                    res = client_zeep.service.cancelar(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        uuids=[param],
                        derCertCSD=cer_bytes,
                        derKeyCSD=key_bytes,
                        contrasenaCSD=service.key_password,
                    )

                    res_sat = res.resultados[0]
                    codigo = getattr(res_sat, "status", 0)
                    mensaje = str(getattr(res_sat, "mensaje", "")).strip()

                    df.at[idx, "ACUSE_CANCELACION"] = f"Código {codigo}: {mensaje}"

                    if (
                        "previamente" in mensaje.lower()
                        or "exito" in mensaje.lower()
                        or codigo == 202
                    ):
                        df.at[idx, "CANCELADO"] = True
                        df.at[idx, "STATUS_SAT"] = "CANCELADO"
                        if pd.isna(df.at[idx, "FECHA CANCELACION"]):
                            df.at[idx, "FECHA CANCELACION"] = datetime.now().strftime(
                                "%Y-%m-%d %H:%M:%S"
                            )
                    elif "proceso" in mensaje.lower():
                        df.at[idx, "STATUS_SAT"] = "EN_PROCESO"
                    else:
                        df.at[idx, "STATUS_SAT"] = f"RECHAZO_{codigo}"

                except Exception as e_pac:
                    df.at[idx, "ACUSE_CANCELACION"] = f"Error PAC: {str(e_pac)}"

            if (idx + 1) % 50 == 0:
                logger.info(
                    f"⏳ Avance: {idx + 1}/{total_rows} registros procesados..."
                )

        # Guardar resultado final en el Excel
        df.to_excel(OUTPUT_EXCEL, index=False)
        logger.info(
            f"✅ ¡Proceso completado con éxito! Excel actualizado guardado en: {OUTPUT_EXCEL}"
        )

    except Exception as e:
        logger.error(f"❌ Error crítico en el procesamiento: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    ejecutar_match_excel()
