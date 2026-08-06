import os
import sys
import time
import pandas as pd
import logging
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("status_cancelacion_asincrona")

# 📌 Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago.xlsx")
OUTPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago_PAC_STATUS.xlsx")


def consultar_status_pac():
    logger.info(f"📂 Cargando archivo Excel: {INPUT_EXCEL}")

    if not os.path.exists(INPUT_EXCEL):
        logger.error(f"❌ No se encontró el archivo: {INPUT_EXCEL}")
        return

    df = pd.read_excel(INPUT_EXCEL)

    # Crear columnas de respuesta en el Dataframe
    for col in ["CODIGO_PAC", "MENSAJE_PAC", "ACUSE_SAT_PAC"]:
        if col not in df.columns:
            df[col] = ""

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        # Cliente SOAP configurado con el WSDL de Timbrado/Cancelación
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        pac_user = service.pac_user
        pac_pass = service.pac_pass

        total_rows = len(df)
        logger.info(
            f"🚀 Consultando 'getStatusCancelacionAsincrona' en el PAC para {total_rows} registros..."
        )

        for idx, row in df.iterrows():
            uuid = str(row["TFD UUID"]).strip().upper()

            if not uuid or uuid == "NAN" or len(uuid) < 30:
                continue

            try:
                # 📡 Uso de diccionario para evitar conflicto con palabra reservada 'pass'
                params_soap = {"user": pac_user, "pass": pac_pass, "uuid": uuid}

                try:
                    res = client_zeep.service.getStatusCancelacionAsincrona(
                        **params_soap
                    )
                except Exception:
                    # Intento alternativo con posicionales si la firma varía
                    res = client_zeep.service.getStatusCancelacionAsincrona(
                        pac_user, pac_pass, uuid
                    )

                status_code = getattr(res, "status", None)
                mensaje = getattr(res, "mensaje", "")
                acuse_sat = getattr(res, "acuseSAT", "")

                df.at[idx, "CODIGO_PAC"] = status_code
                df.at[idx, "MENSAJE_PAC"] = mensaje
                if acuse_sat:
                    df.at[idx, "ACUSE_SAT_PAC"] = str(acuse_sat)

                # 📊 Interpretación de Códigos del PAC:
                # 200, 201, 202: Cancelado / registrado exitosamente
                # 211: En proceso de cancelación
                # 204: No cancelable
                # 702: Transacción no encontrada (Vigente sin solicitud previa)
                if status_code in [200, 201, 202]:
                    df.at[idx, "CANCELADO"] = True
                    if pd.isna(df.at[idx, "FECHA CANCELACION"]):
                        df.at[idx, "FECHA CANCELACION"] = datetime.now().strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )
                elif status_code in [204, 702]:
                    df.at[idx, "CANCELADO"] = False

            except Exception as e_pac:
                err_msg = str(e_pac)
                logger.error(f"   ⚠️ Error en UUID [{uuid}]: {err_msg}")
                df.at[idx, "MENSAJE_PAC"] = f"Error: {err_msg}"

            if (idx + 1) % 50 == 0:
                logger.info(
                    f"⏳ Avance: {idx + 1}/{total_rows} comprobantes auditados..."
                )

            time.sleep(0.05)

        # Guardar reporte auditado
        df.to_excel(OUTPUT_EXCEL, index=False)
        logger.info(
            f"✅ ¡Auditoría completada exitosamente! Resultado guardado en: {OUTPUT_EXCEL}"
        )

    except Exception as e_crit:
        logger.error(f"❌ Error crítico en el proceso: {e_crit}")
    finally:
        db.close()


if __name__ == "__main__":
    consultar_status_pac()
