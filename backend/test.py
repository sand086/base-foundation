import os
import sys
import time
import pandas as pd
import logging
from datetime import datetime
from zeep import Client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("auditoria_pac_cfdi")

# 📌 Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

INPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago.xlsx")
OUTPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago_PAC_REALIDAD.xlsx")

# 🌐 WSDL Confirmado de Consultas (CFDI)
WSDL_SF_CFDI = "https://solucionfactible.com/ws/services/CFDI?wsdl"

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService


def auditar_pac_definitivo():
    logger.info(f"📂 Cargando archivo Excel: {INPUT_EXCEL}")

    if not os.path.exists(INPUT_EXCEL):
        logger.error(f"❌ No se encontró el archivo: {INPUT_EXCEL}")
        return

    df = pd.read_excel(INPUT_EXCEL)

    # Crear columnas nuevas para almacenar el estatus oficial del PAC
    for col in ["CANCELADO_PAC", "AUTORIZADA_PAC", "ESTATUS_PAC", "MENSAJE_PAC"]:
        if col not in df.columns:
            df[col] = ""

    # Obtener credenciales desde la configuración de la app
    db = SessionLocal()
    service = PaymentComplementService(db)
    pac_user = service.pac_user
    pac_pass = service.pac_pass
    db.close()

    try:
        logger.info(
            f"📡 Conectando al Webservice de Consultas de Solución Factible ({WSDL_SF_CFDI})..."
        )
        client = Client(WSDL_SF_CFDI)

        total_rows = len(df)
        logger.info(
            f"🚀 Iniciando escaneo de SÓLO LECTURA 'obtenerDatos' para {total_rows} registros..."
        )

        for idx, row in df.iterrows():
            uuid = str(row["TFD UUID"]).strip().upper()

            if not uuid or uuid == "NAN" or len(uuid) < 30:
                continue

            try:
                # 📡 Parámetros para obtenerDatos
                params = {
                    "usuario": pac_user,
                    "password": pac_pass,
                    "uuid": uuid,
                    "folio": None,
                    "serie": None,
                }

                # Llamada de sólo lectura
                respuesta = client.service.obtenerDatos(**params)

                codigo_status = getattr(respuesta, "status", None)
                mensaje_pac = getattr(respuesta, "mensaje", "OK")

                comprobantes = getattr(respuesta, "comprobantes", [])

                if comprobantes and len(comprobantes) > 0:
                    cfdi = comprobantes[0]

                    # Extraer estatus real desde la respuesta del PAC
                    is_cancelada = getattr(cfdi, "cancelada", False)
                    is_autorizada = getattr(cfdi, "autorizada", True)

                    df.at[idx, "CANCELADO_PAC"] = bool(is_cancelada)
                    df.at[idx, "CANCELADO"] = bool(is_cancelada)
                    df.at[idx, "AUTORIZADA_PAC"] = bool(is_autorizada)
                    df.at[idx, "ESTATUS_PAC"] = (
                        "CANCELADO" if is_cancelada else "VIGENTE"
                    )
                    df.at[idx, "MENSAJE_PAC"] = f"Código {codigo_status}: {mensaje_pac}"

                    # Asignar fecha actual a las canceladas que no tenían fecha previa
                    if is_cancelada and pd.isna(df.at[idx, "FECHA CANCELACION"]):
                        df.at[idx, "FECHA CANCELACION"] = datetime.now().strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )

                else:
                    df.at[idx, "CANCELADO_PAC"] = False
                    df.at[idx, "ESTATUS_PAC"] = "NO_ENCONTRADO_EN_PAC"
                    df.at[idx, "MENSAJE_PAC"] = f"Código {codigo_status}: {mensaje_pac}"

            except Exception as e_pac:
                err_msg = str(e_pac)
                logger.error(f"   ⚠️ Error en fila {idx + 1} [{uuid}]: {err_msg}")
                df.at[idx, "ESTATUS_PAC"] = "ERROR_PETICION"
                df.at[idx, "MENSAJE_PAC"] = f"Error: {err_msg}"

            if (idx + 1) % 50 == 0:
                logger.info(
                    f"⏳ Avance: {idx + 1}/{total_rows} comprobantes auditados..."
                )

            time.sleep(0.05)

        # Guardar reporte
        df.to_excel(OUTPUT_EXCEL, index=False)
        logger.info(
            f"✅ ¡Auditoría completada exitosamente! Guardada en: {OUTPUT_EXCEL}"
        )

    except Exception as e_crit:
        logger.error(f"❌ Error crítico en el proceso: {e_crit}")


if __name__ == "__main__":
    auditar_pac_definitivo()
