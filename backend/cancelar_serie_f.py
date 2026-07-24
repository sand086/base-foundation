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
    "F0145B31-AD12-4409-8D6D-A28EF2F64EAC",
    "11273B09-942D-4795-90B7-29DCB047CD5A",
    "177BB4C9-F629-4929-8AB7-DEC96A3D6B43",
    "2542D1E6-7F1A-4E15-B7BE-6E4D47411951",
    "25D34B8C-35F3-43A9-A17E-DEB94FDE8AE7",
    "286A1468-248B-4374-B89B-07F5084DF10B",
    "30D764A7-3990-4621-B8EB-FE4663404D98",
    "3687BF70-2767-40D7-BFCE-74A4BB1D3584",
    "51C336A8-C43E-4545-961C-21816814E87A",
    "6B489E4B-59C7-4D85-B3F3-4DA9E290982B",
    "7FADEAE1-34A0-474D-B3FE-599FD09B9565",
    "A5E54B3A-0E7D-49BA-9AA1-F71E11EF8227",
    "BA874132-16A5-4594-9140-CC6311B3613F",
    "BD71967A-342B-49E0-AC6B-8FAAC566E1F4",
    "C661CD16-0BED-444B-8F46-9F7A4FA65ABD",
    "CB6C196B-EF18-43A4-8A8E-8A7DEF3288F9",
    "DAEFAC9C-0D7B-4017-915A-5741A0FE350E",
    "DEBB5EDC-FAD4-48EA-BCB6-BF28B61D8F2D",
    "E9104B7B-53F9-4376-BB33-99FACD58BF28",
]

UUIDS_NO_CANCELABLES = [
    # ... tu lista anterior ...
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
