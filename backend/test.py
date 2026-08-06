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
logger = logging.getLogger("sat_soap_audit")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago.xlsx")
OUTPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago_SAT_OFICIAL.xlsx")

# WSDL Oficial del SAT para Consultas
WSDL_SAT_CONSULTA = (
    "https://consultaqf.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl"
)


def consultar_sat_oficial():
    logger.info(f"📂 Buscando archivo Excel en: {INPUT_EXCEL}")

    if not os.path.exists(INPUT_EXCEL):
        logger.error(f"❌ No se encontró el archivo: {INPUT_EXCEL}")
        return

    df = pd.read_excel(INPUT_EXCEL)

    for col in ["ESTADO_SAT", "ES_CANCELABLE", "ESTATUS_CANCELACION_SAT", "CODIGO_SAT"]:
        if col not in df.columns:
            df[col] = ""

    try:
        # Inicializamos el cliente SOAP conectándonos al validador del SAT
        logger.info("📡 Conectando con el Webservice Oficial del SAT...")
        client = Client(WSDL_SAT_CONSULTA)

        total_rows = len(df)
        logger.info(f"🚀 Escaneando {total_rows} folios de forma inofensiva...")

        for idx, row in df.iterrows():
            uuid = str(row["TFD UUID"]).strip().upper()
            rfc_emisor = str(row["RFC EMISOR"]).strip().upper()
            rfc_receptor = str(row["RFC CLIENTE"]).strip().upper()
            total = row["IMPORTE TOTAL"]

            if not uuid or uuid == "NAN" or len(uuid) < 30:
                continue

            # Formatear el total para que el SAT lo acepte
            try:
                total_float = float(total)
                # Omitir los miles, usar decimales completos
                total_str = (
                    f"{total_float:.6f}".rstrip("0").rstrip(".")
                    if total_float % 1 == 0
                    else f"{total_float:.6f}"
                )
            except:
                total_str = str(total)

            expresion = f"?re={rfc_emisor}&rr={rfc_receptor}&tt={total_str}&id={uuid}"

            try:
                # 📡 Llamada al método Consulta del SAT
                resultado = client.service.Consulta(expresionImpresa=expresion)

                estado = getattr(resultado, "Estado", "Desconocido")
                es_cancelable = getattr(resultado, "EsCancelable", "Desconocido")
                estatus_cancelacion = getattr(resultado, "EstatusCancelacion", "N/A")
                codigo_estatus = getattr(resultado, "CodigoEstatus", "N/A")

                df.at[idx, "ESTADO_SAT"] = str(estado)
                df.at[idx, "ES_CANCELABLE"] = str(es_cancelable)
                df.at[idx, "ESTATUS_CANCELACION_SAT"] = str(estatus_cancelacion)
                df.at[idx, "CODIGO_SAT"] = str(codigo_estatus)

                # Clasificar la bandera de Excel según lo que dice el SAT
                if str(estado).lower() == "cancelado":
                    df.at[idx, "CANCELADO"] = True
                    if pd.isna(df.at[idx, "FECHA CANCELACION"]):
                        df.at[idx, "FECHA CANCELACION"] = datetime.now().strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )
                elif str(estado).lower() == "vigente":
                    df.at[idx, "CANCELADO"] = False

            except Exception as e_soap:
                err_msg = str(e_soap)
                logger.error(f"   ⚠️ Error de red con UUID [{uuid}]: {err_msg}")
                df.at[idx, "CODIGO_SAT"] = f"Error: {err_msg}"

            if (idx + 1) % 50 == 0:
                logger.info(f"⏳ Avance: {idx + 1}/{total_rows} procesados...")

            time.sleep(0.1)

        # Guardar archivo auditado
        df.to_excel(OUTPUT_EXCEL, index=False)
        logger.info(
            f"✅ ¡Auditoría SAT completada exitosamente! Guardada en: {OUTPUT_EXCEL}"
        )

    except Exception as e_crit:
        logger.error(f"❌ Error crítico inicializando Zeep: {e_crit}")


if __name__ == "__main__":
    consultar_sat_oficial()
