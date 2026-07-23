import sys
import os
import logging

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("cancelacion_forzada")

UUIDS_A_CANCELAR = [
    "B8C0F0B3-B260-4BCB-B56A-643B915A8FD8",
    "D71B9CFD-3835-4858-953A-3FD809D169BA",
    "D50B2134-87B4-4200-910D-96CDF237E993",
    "B5EE26F0-EA2D-4C56-896F-0D64B42047E3",
    "C40177B1-4823-48A0-B5E4-85E32B7654F8",
    "B1371686-641B-43C6-9769-CF5806590D60",
    "E1DC9939-F323-4FB6-8945-07BA53E8D962",
    "3034CD70-BBBA-4591-A4FD-48275AA2F2C9",
]


def disparar_cancelacion_sat():
    logger.info(
        f"Iniciando proceso de cancelación forzada para {len(UUIDS_A_CANCELAR)} UUIDs en el SAT..."
    )
    db = SessionLocal()

    # Instanciamos el servicio solo para heredar credenciales y certificados
    service = PaymentComplementService(db)

    try:
        # 1. Leer Certificados de la empresa (CSD)
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        logger.info(f"Conectando al PAC: {service.wsdl_timbrado}")
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        # Configurar tamaño de lote para evitar Timeouts del PAC (50 es seguro)
        BATCH_SIZE = 50

        for i in range(0, len(UUIDS_A_CANCELAR), BATCH_SIZE):
            lote = UUIDS_A_CANCELAR[i : i + BATCH_SIZE]

            # 2. Formatear los UUIDs bajo la especificación del PAC (UUID|Motivo|Sustituto)
            uuids_formateados = [f"{uuid.strip()}|02|" for uuid in lote]

            logger.info(f"Enviando lote {i//BATCH_SIZE + 1} ({len(lote)} UUIDs)...")

            # 3. Disparar el SOAP Request al PAC para el lote actual
            resultado = client_zeep.service.cancelar(
                usuario=service.pac_user,
                password=service.pac_pass,
                uuids=uuids_formateados,
                derCertCSD=cer_bytes,
                derKeyCSD=key_bytes,
                contrasenaCSD=service.key_password,
            )

            logger.info(
                f"Respuesta Lote {i//BATCH_SIZE + 1} - Status: {getattr(resultado, 'status', 'S/S')} | Mensaje: {getattr(resultado, 'mensaje', 'S/M')}"
            )

            # 4. Desglosar el estatus de cada UUID de manera detallada
            if hasattr(resultado, "resultados") and resultado.resultados:
                print("\n" + "=" * 70)
                print(f"📊 DETALLE DE CANCELACIÓN (LOTE {i//BATCH_SIZE + 1}):")
                print("=" * 70)
                for res in resultado.resultados:
                    print(f"UUID: {getattr(res, 'uuid', 'DESCONOCIDO')}")
                    print(f"Status SAT: {getattr(res, 'status', 'Sin Status')}")
                    print(f"Mensaje Hacienda: {getattr(res, 'mensaje', 'Sin Mensaje')}")
                    print("-" * 70)
            else:
                logger.warning(
                    f"El PAC procesó el lote {i//BATCH_SIZE + 1} pero no devolvió el desglose individual por UUID."
                )

    except Exception as e:
        logger.error(
            f"❌ Ocurrió un error crítico durante la comunicación con el SAT: {e}"
        )
    finally:
        db.close()
        logger.info("Proceso terminado. Conexión cerrada.")


if __name__ == "__main__":
    disparar_cancelacion_sat()
