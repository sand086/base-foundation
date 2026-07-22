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

# 1. UUIDs con Error "Timeout" (El SAT tardó en responder)
# 👉 Estos se arreglan solos al volver a correr el script.
UUIDS_TIMEOUT = [
    "6B146ED2-6782-420D-AD1E-2EC4CE64F1C6",
    "7A428141-E4A3-4281-9757-9F4D4EA8A79E",
    "2969573F-986E-44DC-B666-F4C535B7BEF3",
    "B02DDE0A-8FEA-4BA7-99AC-F432A8AA24CD",
    "CBC25F52-558D-47F7-9E34-CA5D350937E7",
    "760FDAEE-51EE-4B13-B56F-15A1FF830CC3",
    "BB69AEEF-1B04-40D3-BF3A-18E3FFC45F4E",
    "FCC276F4-27E5-4BE6-9E8D-85102FC4A319",
    "0581E382-75B4-4B58-8986-7B35F128FD4F",
    "3BB0F311-CAA0-411C-AA94-81DA65C24D9B",
    "56DC94AC-3FF7-4F6C-A35B-FF961F8391E1",
]

# 2. UUIDs con Error "305" (Fecha fuera de rango del certificado)
# 👉 Puedes intentar correrlos, a veces es intermitencia del PAC.
# Si siguen fallando, toca cancelarlos manual en el portal del SAT.
UUIDS_ERROR_305 = [
    "946003B2-C4CD-4A46-A007-56C123BEE287",
    "53EA3EAC-B50E-4D85-B926-497B03670FC3",
    "C518FE8A-F285-4EC1-9F47-0ACD9A7EB147",
    "74CAE71B-A679-4B65-96D0-75711C4074AE",
    "D71B9CFD-3835-4858-953A-3FD809D169BA",
    "7BD071F1-A2FC-42E2-A5E2-13B589F1D40A",
    "6AA46348-5CE4-4AF4-8436-6C56FF183EF3",
    "9BFADA33-D7AD-4835-8774-F9CA02A8119D",
    "D4F75442-C232-4F5D-B9D4-BCE7BE9F14F0",
    "5D395656-B743-4F5A-9B17-6C0465479100",
    "8C23230C-CB4F-48D8-B374-8F236D2104FC",
    "264ACA4B-B504-494D-A55B-A06E0F661F5D",
    "079A64FA-22E2-4C95-A0B3-1348E770310F",
    "7D9DB2B8-953B-43BE-A933-7B7F008601C2",
    "A57E1D6D-2025-49A5-B3A6-BD223250A74E",
    "213A1D3A-5657-4F86-B71B-511E9DC23138",
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
UUIDS_A_CANCELAR = UUIDS_TIMEOUT + UUIDS_ERROR_305


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
