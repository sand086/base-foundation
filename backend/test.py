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
logger = logging.getLogger("solucion_factible_obtener_datos")

# 📌 Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago.xlsx")
OUTPUT_EXCEL = os.path.join(
    BASE_DIR, "libro_status_PAC_2026_ago_SOLUCION_FACTIBLE.xlsx"
)


def consultar_solucion_factible():
    logger.info(f"📂 Buscando archivo Excel en: {INPUT_EXCEL}")

    if not os.path.exists(INPUT_EXCEL):
        logger.error(f"❌ No se encontró el archivo: {INPUT_EXCEL}")
        return

    df = pd.read_excel(INPUT_EXCEL)

    # Columnas nuevas para registrar la respuesta de Solución Factible
    for col in ["CANCELADO_PAC", "AUTORIZADA_PAC", "ESTATUS_PAC", "MENSAJE_PAC"]:
        if col not in df.columns:
            df[col] = ""

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        # Instanciar el cliente SOAP del PAC Solución Factible
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        pac_user = service.pac_user
        pac_pass = service.pac_pass

        total_rows = len(df)
        logger.info(
            f"🚀 Consultando 'obtenerDatos' en Solución Factible para {total_rows} folios..."
        )

        for idx, row in df.iterrows():
            uuid = str(row["TFD UUID"]).strip().upper()

            if not uuid or uuid == "NAN" or len(uuid) < 30:
                continue

            try:
                # 📡 Llamada estricta de SOLO LECTURA al método obtenerDatos del PAC
                # Parámetros: usuario, password, uuid, folio (None), serie (None)
                respuesta = client_zeep.service.obtenerDatos(
                    usuario=pac_user,
                    password=pac_pass,
                    uuid=uuid,
                    folio=None,
                    serie=None,
                )

                codigo_status = getattr(respuesta, "status", None)
                mensaje_pac = getattr(respuesta, "mensaje", "OK")

                df.at[idx, "ESTATUS_PAC"] = f"Código {codigo_status}"
                df.at[idx, "MENSAJE_PAC"] = mensaje_pac

                comprobantes = getattr(respuesta, "comprobantes", [])

                if comprobantes and len(comprobantes) > 0:
                    cfdi = comprobantes[0]

                    # Atributos oficiales de la respuesta CFDI de Solución Factible
                    is_cancelada = getattr(cfdi, "cancelada", False)
                    is_autorizada = getattr(cfdi, "autorizada", True)

                    df.at[idx, "CANCELADO_PAC"] = bool(is_cancelada)
                    df.at[idx, "CANCELADO"] = bool(is_cancelada)
                    df.at[idx, "AUTORIZADA_PAC"] = bool(is_autorizada)

                    # Si está cancelada en el PAC y no tenía fecha en el Excel, asignar timestamp
                    if is_cancelada and pd.isna(df.at[idx, "FECHA CANCELACION"]):
                        df.at[idx, "FECHA CANCELACION"] = datetime.now().strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )

                else:
                    df.at[idx, "CANCELADO_PAC"] = "NO_ENCONTRADO"

            except Exception as e_pac:
                err_msg = str(e_pac)
                logger.error(f"   ⚠️ Error leyendo UUID [{uuid}]: {err_msg}")
                df.at[idx, "MENSAJE_PAC"] = f"Error WS: {err_msg}"

            # Bitácora de avance cada 50 filas
            if (idx + 1) % 50 == 0:
                logger.info(
                    f"⏳ Avance: {idx + 1}/{total_rows} consultados en el PAC..."
                )

            time.sleep(0.05)  # Pausa ligera para no saturar la conexión

        # Guardar reporte
        df.to_excel(OUTPUT_EXCEL, index=False)
        logger.info(
            f"✅ ¡Auditoría completada exitosamente! Guardada en: {OUTPUT_EXCEL}"
        )

    except Exception as e_crit:
        logger.error(f"❌ Error crítico en el proceso: {e_crit}")
    finally:
        db.close()


if __name__ == "__main__":
    consultar_solucion_factible()
