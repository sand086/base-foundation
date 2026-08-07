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
logger = logging.getLogger("reintento_acuses")

# Archivo de entrada y salida es el mismo para actualizarlo
ARCHIVO_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago_cancelados2.xlsx")


def reintentar_rebeldes():
    if not os.path.exists(ARCHIVO_EXCEL):
        logger.error(f"❌ No se encontró el archivo: {ARCHIVO_EXCEL}")
        return

    logger.info(f"📂 Cargando archivo de rebeldes: {ARCHIVO_EXCEL}")
    df = pd.read_excel(ARCHIVO_EXCEL)

    # Asegurar que existan las columnas de salida
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
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        total = len(df)
        logger.info(f"🚀 Iniciando REINTENTO para {total} registros rebeldes...")

        for idx, row in df.iterrows():
            uuid = None
            for col_candidate in ["TFD UUID", "UUID", "uuid", "TFD_UUID"]:
                if col_candidate in df.columns and pd.notna(row[col_candidate]):
                    uuid = str(row[col_candidate]).strip().upper()
                    break

            if not uuid or len(uuid) < 30:
                continue

            param = f"{uuid}|02|"
            max_retries = 3  # Damos 3 intentos por si el SAT sigue lento

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

                    if (
                        "previamente cancelado" in msg_lower
                        or "exito" in msg_lower
                        or codigo in [201, 202, 200]
                    ):
                        df.at[idx, "ESTATUS_PROCESO"] = "CANCELADO / ACUSE OBTENIDO"
                    elif "proceso" in msg_lower or codigo == 211:
                        df.at[idx, "ESTATUS_PROCESO"] = "EN_PROCESO_EN_SAT"
                    elif "no cancelable" in msg_lower or codigo == 204:
                        df.at[idx, "ESTATUS_PROCESO"] = "BLOQUEADO_POR_RELACION"
                    else:
                        df.at[idx, "ESTATUS_PROCESO"] = f"RECHAZO_SAT ({codigo})"

                    logger.info(f"   ✅ UUID {uuid[:8]}... procesado (Código {codigo})")
                    break  # Salir del loop de reintentos si funcionó o si respondió algo claro

                except Exception as e:
                    if intento < max_retries - 1:
                        logger.warning(
                            f"   ⚠️ SAT Lento en UUID {uuid[:8]}... reintentando en 2s (Intento {intento+2}/{max_retries})"
                        )
                        time.sleep(2.0)
                    else:
                        logger.error(
                            f"   ❌ Fallo final en UUID {uuid[:8]}... : {str(e)[:50]}"
                        )
                        df.at[idx, "ESTATUS_PROCESO"] = "ERROR_RED_PAC_SAT"
                        df.at[idx, "MENSAJE_PAC_SAT"] = str(e)
                        df.at[idx, "CODIGO_SAT"] = "500_TIMEOUT"

            # 💾 Guardar progreso cada 5 registros por ser archivo corto
            if (idx + 1) % 5 == 0:
                df.to_excel(ARCHIVO_EXCEL, index=False)

            time.sleep(
                1.0
            )  # Pausa más larga (1 seg) entre folios para no saturar al SAT

        # Guardado final
        df.to_excel(ARCHIVO_EXCEL, index=False)
        logger.info(
            f"✅ ¡Proceso finalizado! Se actualizó la data directamente en: {ARCHIVO_EXCEL}"
        )

    except Exception as e_crit:
        logger.error(f"❌ Error crítico: {e_crit}")
    finally:
        db.close()


if __name__ == "__main__":
    reintentar_rebeldes()
