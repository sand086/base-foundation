import os
import sys
import time
import pandas as pd
import logging
from datetime import datetime

# 📌 Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("obtener_acuses")

INPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago_cancelados.xlsx")
OUTPUT_EXCEL = os.path.join(
    BASE_DIR, "libro_status_PAC_2026_ago_cancelados_ACUSES.xlsx"
)


def procesar_acuses():
    if not os.path.exists(INPUT_EXCEL):
        logger.error(f"❌ No se encontró el archivo de entrada: {INPUT_EXCEL}")
        return

    logger.info(f"📂 Cargando archivo Excel: {INPUT_EXCEL}")
    df = pd.read_excel(INPUT_EXCEL)

    # Columnas de diagnóstico y acuse
    columnas_resultado = [
        "ESTATUS_PROCESO",
        "CODIGO_SAT",
        "MENSAJE_PAC_SAT",
        "ACUSE_DETALLE",
        "FECHA_CONSULTA",
    ]
    for col in columnas_resultado:
        if col not in df.columns:
            df[col] = ""

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        # Cargar certificados CSD para autenticación ante el SAT
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        total = len(df)
        logger.info(f"🚀 Iniciando extracción de acuses para {total} registros...")

        for idx, row in df.iterrows():
            # Buscar la columna del UUID sin importar si se llama 'TFD UUID', 'UUID' o 'uuid'
            uuid = None
            for col_candidate in ["TFD UUID", "UUID", "uuid", "TFD_UUID"]:
                if col_candidate in df.columns and pd.notna(row[col_candidate]):
                    uuid = str(row[col_candidate]).strip().upper()
                    break

            if not uuid or len(uuid) < 30:
                continue

            param = f"{uuid}|02|"
            max_retries = 2

            for intento in range(max_retries):
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
                    mensaje = str(getattr(res_sat, "mensaje", "")).strip()
                    acuse = getattr(res_sat, "acuse", "")

                    df.at[idx, "CODIGO_SAT"] = codigo
                    df.at[idx, "MENSAJE_PAC_SAT"] = mensaje
                    df.at[idx, "ACUSE_DETALLE"] = str(acuse) if acuse else mensaje
                    df.at[idx, "FECHA_CONSULTA"] = datetime.now().strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )

                    msg_lower = mensaje.lower()

                    # Clasificación inteligente de la respuesta
                    if (
                        "previamente cancelado" in msg_lower
                        or "exito" in msg_lower
                        or codigo in [201, 202, 200]
                    ):
                        df.at[idx, "ESTATUS_PROCESO"] = "CANCELADO / ACUSE OBTENIDO"
                        if "CANCELADO" in df.columns:
                            df.at[idx, "CANCELADO"] = True
                    elif "proceso" in msg_lower or codigo == 211:
                        df.at[idx, "ESTATUS_PROCESO"] = "EN_PROCESO_EN_SAT"
                    elif "no cancelable" in msg_lower or codigo == 204:
                        df.at[idx, "ESTATUS_PROCESO"] = "BLOQUEADO_POR_RELACION"
                    else:
                        df.at[idx, "ESTATUS_PROCESO"] = f"RECHAZO_SAT ({codigo})"

                    break

                except Exception as e:
                    if intento < max_retries - 1:
                        logger.warning(
                            f"   ⚠️ Reintentando UUID {uuid} por tiempo de espera..."
                        )
                        time.sleep(1.5)
                    else:
                        logger.error(f"   ❌ Error en fila {idx + 1} [{uuid}]: {e}")
                        df.at[idx, "ESTATUS_PROCESO"] = "ERROR_RED_PAC"
                        df.at[idx, "MENSAJE_PAC_SAT"] = str(e)

            # Pausa de seguridad (0.5 segundos por registro)
            time.sleep(0.5)

            if (idx + 1) % 25 == 0:
                logger.info(f"⏳ Avance: {idx + 1}/{total} acuses procesados...")

        # Guardar resultado final
        df.to_excel(OUTPUT_EXCEL, index=False)
        logger.info(
            f"✅ ¡Proceso completado! Archivo final guardado en: {OUTPUT_EXCEL}"
        )

    except Exception as e_crit:
        logger.error(f"❌ Error crítico cargando certificados o cliente SOAP: {e_crit}")
    finally:
        db.close()


if __name__ == "__main__":
    procesar_acuses()
