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
    # 20 Complementos de Pago
    "CB6C196B-EF18-43A4-8A8E-8A7DEF3288F9",
    "DAEFAC9C-0D7B-4017-915A-5741A0FE350E",
    "2542D1E6-7F1A-4E15-B7BE-6E4D47411951",
    "11273B09-942D-4795-90B7-29DCB047CD5A",
    "E9104B7B-53F9-4376-BB33-99FACD58BF28",
    "3687BF70-2767-40D7-BFCE-74A4BB1D3584",
    "25D34B8C-35F3-43A9-A17E-DEB94FDE8AE7",
    "BA874132-16A5-4594-9140-CC6311B3613F",
    "51C336A8-C43E-4545-961C-21816814E87A",
    "286A1468-248B-4374-B89B-07F5084DF10B",
    "C661CD16-0BED-444B-8F46-9F7A4FA65ABD",
    "6B489E4B-59C7-4D85-B3F3-4DA9E290982B",
    "09F09DE4-C139-48F1-821C-42B6C493CDA5",
    "DEBB5EDC-FAD4-48EA-BCB6-BF28B61D8F2D",
    "30D764A7-3990-4621-B8EB-FE4663404D98",
    "7FADEAE1-34A0-474D-B3FE-599FD09B9565",
    "BD71967A-342B-49E0-AC6B-8FAAC566E1F4",
    "177BB4C9-F629-4929-8AB7-DEC96A3D6B43",
    "A5E54B3A-0E7D-49BA-9AA1-F71E11EF8227",
    "A313D258-CC83-4246-9DB3-A5C94F505C8B",
    "C518FE8A-F285-4EC1-9F47-0ACD9A7EB147",
    "5D395656-B743-4F5A-9B17-6C0465479100",
]


# 3. UUIDs "NO CANCELABLE"
# 👉 Tienen facturas/pagos amarrados, correr el script no te dejará hasta desvincularlos.
UUIDS_NO_CANCELABLES = [
    "2A5ED0D3-F219-48AC-8C5C-1ACF0160E7BA",
    "26D54643-486C-4FD3-89CC-79D7226494B1",
    "C567C900-047C-4B0D-A0BE-F4446C2AE69A",
    "E33E7737-7CDE-4B5B-BD9C-85631C548377",
    "E274FF8D-CA5C-48E1-ACCC-2C09529019BC",
    "81088AD1-5976-4FA0-B5F4-B1EAC4CF36F4",
    "7DB87625-E8FE-4026-AC3D-AB61647B0B25",
    "0A262953-D74C-4019-8943-26218E8CFB30",
    "E5E6964B-07C2-4365-9BD4-B6677DF35ED3",
    "EF1E811E-A51E-4371-89CF-868D7F6681F4",
    "702735D6-8975-48A8-B8A9-1B61EC716AEE",
    "4C88C059-5A76-4C8A-819F-897171E31838",
    "9F9C4748-02A1-40C2-BDCD-6EF862C66B41",
    "49100456-EF69-458B-84B5-8A20F5389BB0",
    "0F1A3B0B-725E-4EEB-9D17-8F8D467B7BDF",
    "2624E912-4210-46B4-86C1-AC9AEBA9E604",
    "7033B334-AC59-45FB-A86E-B4025549A9C9",
    "05A343AE-AFF2-4A1F-A06A-413FD49B3D16",
    "C4EA4AB8-3DC4-4CFD-942E-735052420725",
    "725EA400-A4FB-4933-9FD1-7FA51ED4AF65",
    "75834706-6320-4E26-BABA-3B3A7C8AF4AC",
    "45B253B4-7A67-4387-AC0E-5C6E988A3095",
    "FFE352ED-48AE-473C-9759-A17D50CBD9AF",
    "4327C425-4376-4892-BA11-49A4656602C7",
    "D20ABF05-85E6-4701-B066-3098B90FE295",
    "73F9E6AE-4C72-4D1A-A568-7561658F429F",
    "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3",
    "0E72BD82-8253-481D-80B2-35E0F8919E06",
    "15DE708D-0643-4E3A-BABD-F72B59C20753",
    "3A1624D8-BE6D-4653-BEAB-616A808982FC",
    "1A5F3059-EB89-4639-87A5-54A41DC69F6B",
]

# Puedes unir las dos primeras listas para tu script actual:
UUIDS_A_CANCELAR = UUIDS_TIMEOUT


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
