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
    # --- 21/07/2026 ---
    "D724C631-CB31-4F34-B168-44B33AF3A8A6",
    "22BD62C0-770C-4566-B7A3-1DD1E38758D2",
    "12EF2D29-7D04-4C87-81AD-768C743D4CEB",
    "AA304705-B317-4835-A8C2-665EC29B0B23",
    "3FF006D4-4FCE-491A-90B8-77B29D2B304C",
    "3F58CCA3-B237-495B-86F7-00D756897A56",
    "B82E2665-8F64-4953-A859-C60524579C1F",
    "13E9B274-B370-41B6-BA38-BEDDCDECEB69",
    "819F2161-FC24-49AC-ACB1-15D220CF18AA",
    "5FBE3F6B-3E6A-4DB1-A660-13DA5E266DC5",
    "336676C6-01E6-4DBE-8610-9E1A892EAF73",
    "B8C0F0B3-B260-4BCB-B56A-643B915A8FD8",
    "7C7EE265-5874-4010-AFFF-E1652FA5F30C",
    "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF",
    "2CAE4DEC-F515-4FCA-991B-7A79884B7188",
    "9F73FD07-B4A7-4699-A7EC-481BAA7496BE",
    "B3937316-1B2E-4B97-813A-1276E9DCD49B",
    "16A13839-49E2-46D0-BE17-CB12360E1E49",
    "C9ECD3BD-A1EA-4CF0-9A26-95672D18E03D",
    "D7936279-1D45-4ADC-AFAC-BD6CB9FEFDB2",
    "3C091D7A-66AB-4F3B-A619-2BD1348242DA",
    # --- 20/07/2026 y anteriores ---
    "6B146ED2-6782-420D-AD1E-2EC4CE64F1C6",
    "C518FE8A-F285-4EC1-9F47-0ACD9A7EB147",
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
    "D71B9CFD-3835-4858-953A-3FD809D169BA",
    "2624E912-4210-46B4-86C1-AC9AEBA9E604",
    "7BD071F1-A2FC-42E2-A5E2-13B589F1D40A",
    "7033B334-AC59-45FB-A86E-B4025549A9C9",
    "05A343AE-AFF2-4A1F-A06A-413FD49B3D16",
    "C4EA4AB8-3DC4-4CFD-942E-735052420725",
    "725EA400-A4FB-4933-9FD1-7FA51ED4AF65",
    "75834706-6320-4E26-BABA-3B3A7C8AF4AC",
    "45B253B4-7A67-4387-AC0E-5C6E988A3095",
    "FFE352ED-48AE-473C-9759-A17D50CBD9AF",
    "4327C425-4376-4892-BA11-49A4656602C7",
    "D20ABF05-85E6-4701-B066-3098B90FE295",
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
