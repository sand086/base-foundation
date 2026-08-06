import os
import sys
import time
import requests
import pandas as pd
import xml.etree.ElementTree as ET
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("sat_read_only_audit")

# 📌 RUTA ABSOLUTA AUTOMÁTICA (Busca en la misma carpeta donde esté este .py)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago.xlsx")
OUTPUT_EXCEL = os.path.join(BASE_DIR, "libro_status_PAC_2026_ago_AUDITADO_SAT.xlsx")

URL_SAT_CONSULTA = (
    "https://consultaqf.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc"
)

HEADERS_SOAP = {
    "Content-Type": "text/xml;charset=UTF-8",
    "SOAPAction": "http://tempuri.org/IConsultaCFDIService/Consulta",
}


def auditar_excel_solo_lectura():
    logger.info(f"📂 Buscando archivo en: {INPUT_EXCEL}")

    if not os.path.exists(INPUT_EXCEL):
        logger.error(f"❌ No se encontró el archivo en la ruta: {INPUT_EXCEL}")
        return

    logger.info(f"📊 Cargando archivo Excel exitosamente...")
    df = pd.read_excel(INPUT_EXCEL)

    # Crear columnas nuevas para almacenar la auditoría del SAT
    columnas_nuevas = [
        "ESTADO_SAT",
        "ES_CANCELABLE",
        "ESTATUS_CANCELACION",
        "RESPUESTA_OFICIAL_SAT",
    ]
    for col in columnas_nuevas:
        if col not in df.columns:
            df[col] = ""

    total_rows = len(df)
    logger.info(
        f"🔍 Iniciando auditoría de SOLO LECTURA para {total_rows} comprobantes..."
    )

    namespaces = {
        "a": "http://schemas.datacontract.org/2004/07/Sat.Cfdi.Negocio.ConsultaCfdi.Servicio"
    }

    for idx, row in df.iterrows():
        uuid = str(row["TFD UUID"]).strip().upper()
        rfc_emisor = str(row["RFC EMISOR"]).strip().upper()
        rfc_receptor = str(row["RFC CLIENTE"]).strip().upper()
        total = row["IMPORTE TOTAL"]

        if not uuid or uuid == "NAN" or len(uuid) < 30:
            continue

        try:
            total_str = f"{float(total):.6f}"
        except Exception:
            total_str = str(total)

        expresion_impresa = (
            f"?re={rfc_emisor}&rr={rfc_receptor}&tt={total_str}&id={uuid}"
        )

        soap_envelope = f"""<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:Consulta>
         <tem:expresionImpresa><![CDATA[{expresion_impresa}]]></tem:expresionImpresa>
      </tem:Consulta>
   </soapenv:Body>
</soapenv:Envelope>"""

        try:
            response = requests.post(
                URL_SAT_CONSULTA, data=soap_envelope, headers=HEADERS_SOAP, timeout=12
            )

            if response.status_code == 200:
                root = ET.fromstring(response.text)

                estado = root.find(".//a:Estado", namespaces)
                es_cancelable = root.find(".//a:EsCancelable", namespaces)
                estatus_canc = root.find(".//a:EstatusCancelacion", namespaces)
                codigo = root.find(".//a:CodigoEstatus", namespaces)

                txt_estado = (
                    estado.text if estado is not None and estado.text else "Desconocido"
                )
                txt_cancelable = (
                    es_cancelable.text
                    if es_cancelable is not None and es_cancelable.text
                    else "N/A"
                )
                txt_estatus_canc = (
                    estatus_canc.text
                    if estatus_canc is not None and estatus_canc.text
                    else "Sin estatus"
                )
                txt_codigo = codigo.text if codigo is not None and codigo.text else ""

                df.at[idx, "ESTADO_SAT"] = txt_estado
                df.at[idx, "ES_CANCELABLE"] = txt_cancelable
                df.at[idx, "ESTATUS_CANCELACION"] = txt_estatus_canc
                df.at[idx, "RESPUESTA_OFICIAL_SAT"] = (
                    f"{txt_codigo} | {txt_estatus_canc}"
                )

                if txt_estado.lower() == "cancelado":
                    df.at[idx, "CANCELADO"] = True
                    if pd.isna(df.at[idx, "FECHA CANCELACION"]):
                        df.at[idx, "FECHA CANCELACION"] = datetime.now().strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )
                elif txt_estado.lower() == "vigente":
                    df.at[idx, "CANCELADO"] = False

            else:
                df.at[idx, "RESPUESTA_OFICIAL_SAT"] = (
                    f"HTTP Error {response.status_code}"
                )

        except Exception as e:
            df.at[idx, "RESPUESTA_OFICIAL_SAT"] = f"Error de conexión: {str(e)}"

        if (idx + 1) % 50 == 0:
            logger.info(f"⏳ Avance de lectura: {idx + 1}/{total_rows} auditados...")

        time.sleep(0.05)

    df.to_excel(OUTPUT_EXCEL, index=False)
    logger.info(f"✅ Auditoría completada. Excel guardado en: {OUTPUT_EXCEL}")


if __name__ == "__main__":
    auditar_excel_solo_lectura()
