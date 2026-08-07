import os
import sys
import time
import pandas as pd
import logging
from datetime import datetime
from io import StringIO

# 📌 Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("cancelacion_individual")

ARCHIVO_SALIDA = os.path.join(
    BASE_DIR, "libro_status_PAC_2026_ago_cancelado_SINGLE.xlsx"
)

# 📋 Dato crudo del único folio que falló por Timeout
DATOS_CRUDOS = """FOLIO\tNOMBRE SERIE\tRFC EMISOR\tNOMBRE EMISOR\tRFC CLIENTE\tNOMBRE CLIENTE\tTFD UUID\tFECHA EMISION\tIMPORTE TOTAL
17611\tCP\tRTX110624KP5\tRAPIDOS 3T\tCAR091028R36\tCARGOLIVE\tB8062A05-AE1D-471C-84BE-43B73AD5509F\t2026-06-11 12:10:53\t1.12"""


def reintentar_folio_individual():
    # Cargar los datos crudos a un DataFrame
    df = pd.read_csv(StringIO(DATOS_CRUDOS), sep="\t")

    # Crear columnas para el resultado
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
        # Cargar los bytes de los certificados CSD
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        # Conectar al WSDL de Timbrado/Cancelación
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        logger.info("🚀 Iniciando Petición de Rescate de Acuse para el FOLIO 17611...")

        for idx, row in df.iterrows():
            uuid = str(row["TFD UUID"]).strip()

            if not uuid or len(uuid) < 30:
                continue

            param = f"{uuid}|02|"

            # 🛑 Vamos a darle hasta 5 intentos con pausas de 10 segundos
            max_retries = 5

            for intento in range(max_retries):
                try:
                    logger.info(
                        f"   ▶️ Intento {intento+1} de {max_retries} enviando petición al SAT..."
                    )
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
                        logger.info(
                            f"   ✅ ¡Por fin! Acuse rescatado con éxito (Código {codigo})"
                        )
                        break
                    elif "proceso" in msg_lower or codigo == 211:
                        df.at[idx, "ESTATUS_PROCESO"] = "EN_PROCESO_EN_SAT"
                        logger.warning(f"   ⚠️ En proceso de SAT (Código {codigo})")
                        break
                    elif "no cancelable" in msg_lower or codigo == 204:
                        df.at[idx, "ESTATUS_PROCESO"] = "BLOQUEADO_POR_RELACION"
                        logger.warning(
                            f"   ⚠️ Bloqueado por relación (Código {codigo})"
                        )
                        break
                    elif codigo == 500:
                        # Si el SAT manda otro timeout 500, forzamos que caiga en el bloque 'except' para que espere y reintente
                        raise Exception(f"Error 500 del SAT: {mensaje}")
                    else:
                        df.at[idx, "ESTATUS_PROCESO"] = f"RECHAZO_SAT ({codigo})"
                        logger.error(f"   ❌ Rechazo definitivo: {mensaje}")
                        break

                except Exception as e:
                    if intento < max_retries - 1:
                        logger.warning(
                            f"   ⏳ El SAT sigue lento. Respirando por 10 segundos antes del próximo intento..."
                        )
                        time.sleep(10.0)
                    else:
                        logger.error(
                            f"   ❌ Fallo final tras {max_retries} intentos: {str(e)[:60]}"
                        )
                        df.at[idx, "ESTATUS_PROCESO"] = "ERROR_TIMEOUT_SAT"
                        df.at[idx, "MENSAJE_PAC_SAT"] = str(e)
                        df.at[idx, "CODIGO_SAT"] = "500"

        # Guardado final
        df.to_excel(ARCHIVO_SALIDA, index=False)
        logger.info(f"✅ ¡Proceso finalizado! Tu reporte está en: {ARCHIVO_SALIDA}")

    except Exception as e_crit:
        logger.error(f"❌ Error crítico cargando cliente SOAP: {e_crit}")
    finally:
        db.close()


if __name__ == "__main__":
    reintentar_folio_individual()
