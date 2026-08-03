import sys

import os

import logging
import csv
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("cancelacion_forzada")

UUIDS_ERROR_CERTIFICADO = [
    "D50B2134-87B4-4200-910D-96CDF237E993",
    "3F58CCA3-B237-495B-86F7-00D756897A56",
    "7BD071F1-A2FC-42E2-A5E2-13B589F1D40A",
]

UUIDS_A_CANCELAR = [
    "CD0ACDEC-8DCD-4625-B4D2-17068488A997",
    "224ACF23-D2A7-4896-84FC-88BC5EB58916",
    "1093A3BB-F9F6-441E-B1C9-7F8946D70769",
    "0E84E197-0696-4A7F-B1B4-885B95FB9711",
    "AFD65A3C-E1E5-4438-9BD7-227B1F89AA35",
    "C22E9512-593B-408E-96D0-51816C1EBBFE",
]


UUIDS_NO_CANCELABLES = [
    # Error 305: Fecha fuera del rango de validez del certificado
    "282E2B87-D04D-4CDC-93CC-B49D30D5AC4B",
    "51C336A8-C43E-4545-961C-21816814E87A",
    "6B489E4B-59C7-4D85-B3F3-4DA9E290982B",
    "BA874132-16A5-4594-9140-CC6311B3613F",
    "BD71967A-342B-49E0-AC6B-8FAAC566E1F4",
    # Error 500: Timeout del servicio del SAT
    "25D34B8C-35F3-43A9-A17E-DEB94FDE8AE7",
    "286A1468-248B-4374-B89B-07F5084DF10B",
    "7FADEAE1-34A0-474D-B3FE-599FD09B9565",
    "DAEFAC9C-0D7B-4017-915A-5741A0FE350E",
    "E9104B7B-53F9-4376-BB33-99FACD58BF28",
    # Continúan en proceso de cancelación (pendientes de aceptación/procesamiento)
    "37551337-67D0-436E-8045-AC8044449066",
    "8C59F132-4BF4-4E69-A21F-1C3B246F4339",
    "95793C05-6F47-4B7D-8F0C-C97718B08627",
    "B7648014-0047-4FF6-BF90-8BAF63702B42",
    "CE75F2A6-B285-4ABD-B944-48A738E8F23B",
    "16693ED9-532A-45F5-9FD1-C5C8FE12AA75",
    "98876639-F013-401C-A2C9-79317CD7EEF9",
]


def disparar_cancelacion_sat():
    # 1. Limpieza de UUIDs: mayúsculas, sin espacios y sin duplicados
    uuids_limpios = list(
        dict.fromkeys([u.strip().upper() for u in UUIDS_A_CANCELAR if u.strip()])
    )

    logger.info(
        f"Iniciando proceso de cancelación forzada para {len(uuids_limpios)} UUIDs únicos en el SAT..."
    )

    # Preparar archivo de evidencia CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_cancelacion_{timestamp}.csv"

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        # Leer Certificados de la empresa (CSD)
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        logger.info(f"Conectando al PAC: {service.wsdl_timbrado}")
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        BATCH_SIZE = 50

        # Abrimos el CSV para ir guardando conforme responde el PAC
        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(["Num_Lote", "UUID", "Status_SAT", "Mensaje_SAT"])

            for i in range(0, len(uuids_limpios), BATCH_SIZE):
                num_lote = i // BATCH_SIZE + 1
                lote = uuids_limpios[i : i + BATCH_SIZE]
                uuids_formateados = [f"{uuid}|02|" for uuid in lote]

                logger.info(f"Enviando lote {num_lote} ({len(lote)} UUIDs)...")

                try:
                    # Disparar el SOAP Request por lote de manera aislada
                    resultado = client_zeep.service.cancelar(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        uuids=uuids_formateados,
                        derCertCSD=cer_bytes,
                        derKeyCSD=key_bytes,
                        contrasenaCSD=service.key_password,
                    )

                    logger.info(
                        f"Respuesta Lote {num_lote} - Status: {getattr(resultado, 'status', 'S/S')} | Mensaje: {getattr(resultado, 'mensaje', 'S/M')}"
                    )

                    if hasattr(resultado, "resultados") and resultado.resultados:
                        print("\n" + "=" * 70)
                        print(f"📊 DETALLE DE CANCELACIÓN (LOTE {num_lote}):")
                        print("=" * 70)

                        for res in resultado.resultados:
                            u_res = getattr(res, "uuid", "DESCONOCIDO")
                            st_res = getattr(res, "status", "Sin Status")
                            msg_res = getattr(res, "mensaje", "Sin Mensaje")

                            print(f"UUID: {u_res}")
                            print(f"Status SAT: {st_res}")
                            print(f"Mensaje Hacienda: {msg_res}")
                            print("-" * 70)

                            # Escribir en evidencia CSV inmediatamente
                            writer.writerow([num_lote, u_res, st_res, msg_res])
                    else:
                        logger.warning(
                            f"El PAC procesó el lote {num_lote} pero no devolvió el desglose individual."
                        )

                except Exception as e_lote:
                    # El fallo de un lote no mata al script; continúa con el siguiente
                    logger.error(
                        f"❌ Error crítico en el Lote {num_lote}: {e_lote}. Saltando al siguiente bloque..."
                    )
                    for uuid_fallido in lote:
                        writer.writerow(
                            [num_lote, uuid_fallido, "ERROR_EXCEPCION", str(e_lote)]
                        )
                    continue

        logger.info(f"📁 Evidencia guardada exitosamente en: {csv_filename}")

    except Exception as e_general:
        logger.error(
            f"❌ Ocurrió un error fatal al inicializar certificados o conexión al PAC: {e_general}"
        )
    finally:
        db.close()
        logger.info("Proceso terminado. Conexión cerrada.")


if __name__ == "__main__":
    disparar_cancelacion_sat()
