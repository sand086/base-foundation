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

# 📋 LISTA DE LOS 124 UUIDS QUE QUEDARON EN EL SAT
UUIDS_A_CANCELAR = [
    "6B146ED2-6782-420D-AD1E-2EC4CE64F1C6",
    "B9DA96FD-E580-4149-B0BC-EE7627630842",
    "9A41801D-6A12-48A9-9CAF-C3F088265900",
    "C47DD4B3-03FD-4B20-9C2F-A901C0654FA2",
    "946003B2-C4CD-4A46-A007-56C123BEE287",
    "53EA3EAC-B50E-4D85-B926-497B03670FC3",
    "C518FE8A-F285-4EC1-9F47-0ACD9A7EB147",
    "B576999B-70FE-4B3E-8CEA-9FC264518B85",
    "DDBEA5B7-1FCC-4371-97AD-02AD6024102D",
    "2A5ED0D3-F219-48AC-8C5C-1ACF0160E7BA",
    "26D54643-486C-4FD3-89CC-79D7226494B1",
    "85D485E5-898C-4ED6-9BD2-59854A58FC66",
    "C567C900-047C-4B0D-A0BE-F4446C2AE69A",
    "4FA675B1-E63D-427F-B49A-E96D49F0F4CF",
    "7A428141-E4A3-4281-9757-9F4D4EA8A79E",
    "E33E7737-7CDE-4B5B-BD9C-85631C548377",
    "E274FF8D-CA5C-48E1-ACCC-2C09529019BC",
    "81088AD1-5976-4FA0-B5F4-B1EAC4CF36F4",
    "348E3607-65DE-4F5C-9009-682FDABF67AC",
    "7DB87625-E8FE-4026-AC3D-AB61647B0B25",
    "74CAE71B-A679-4B65-96D0-75711C4074AE",
    "0A262953-D74C-4019-8943-26218E8CFB30",
    "DC2B9759-C36C-489A-A298-9C2AE340F470",
    "E5E6964B-07C2-4365-9BD4-B6677DF35ED3",
    "EF1E811E-A51E-4371-89CF-868D7F6681F4",
    "C4E67A08-26F9-4B19-B2D0-4EF545F11F24",
    "702735D6-8975-48A8-B8A9-1B61EC716AEE",
    "4C88C059-5A76-4C8A-819F-897171E31838",
    "9F9C4748-02A1-40C2-BDCD-6EF862C66B41",
    "88C85A42-5288-46A9-B89A-304F30DF268A",
    "49100456-EF69-458B-84B5-8A20F5389BB0",
    "CABD5CFC-21C3-46C5-9D8F-4A06D5E686AB",
    "0F1A3B0B-725E-4EEB-9D17-8F8D467B7BDF",
    "D71B9CFD-3835-4858-953A-3FD809D169BA",
    "2624E912-4210-46B4-86C1-AC9AEBA9E604",
    "7BD071F1-A2FC-42E2-A5E2-13B589F1D40A",
    "7033B334-AC59-45FB-A86E-B4025549A9C9",
    "74D5139C-E5A3-4EB4-A201-D68AEA0569E8",
    "80766F05-939E-4B5C-8E1C-5F10C9ECFDD5",
    "05A343AE-AFF2-4A1F-A06A-413FD49B3D16",
    "C4EA4AB8-3DC4-4CFD-942E-735052420725",
    "87664C05-0F59-40DB-B27B-AA87222AA4A6",
    "061AC15F-3FAE-41C2-AF12-BDAE82DF7FD8",
    "20C82DCC-5B6C-4A0F-8DB0-B7B812EBAA30",
    "02161AD1-CC24-4E77-A6B0-886EB7404CC3",
    "C8B72C1D-48D1-471C-B981-E191B1F41E10",
    "3AE350E2-07AA-464B-9E0A-CF659421C4CC",
    "725EA400-A4FB-4933-9FD1-7FA51ED4AF65",
    "75834706-6320-4E26-BABA-3B3A7C8AF4AC",
    "B3C3ECEE-49A2-47FC-A301-0AA3190AE7F1",
    "C8410626-D5B2-4472-8026-914AD7A0E966",
    "AB927972-3EBC-4A9B-B24B-8D55FE1038B9",
    "45B253B4-7A67-4387-AC0E-5C6E988A3095",
    "81ED85FC-8C3E-436F-BFE0-60FBA0B7EBDA",
    "A794042B-CD8F-428B-993B-843B98668F31",
    "E4E6088E-3DE0-4C8C-B67A-D939AF2D96FE",
    "3EEDCA35-6D44-451B-997A-01C7F1072692",
    "54669158-B8A1-4424-AB46-CA7F1FF4F02B",
    "F14FDB3D-1035-4844-9B76-620B0BAB0506",
    "2969573F-986E-44DC-B666-F4C535B7BEF3",
    "F370D22F-83C5-4D2E-BDD8-38D36D0EA16D",
    "2BC9A619-028E-488A-990F-6ECCC41D1400",
    "848FFC55-6E73-4D10-8C61-54CA4F3DFA3D",
    "B02DDE0A-8FEA-4BA7-99AC-F432A8AA24CD",
    "D85309E9-B4E3-4DC5-B936-4ED73AAC576C",
    "FFE352ED-48AE-473C-9759-A17D50CBD9AF",
    "6AA46348-5CE4-4AF4-8436-6C56FF183EF3",
    "4327C425-4376-4892-BA11-49A4656602C7",
    "D20ABF05-85E6-4701-B066-3098B90FE295",
    "2956AFFF-E9EA-46A8-B98C-96B079FBC1F2",
    "11FD11D5-CAAF-4EAD-A9D3-56B8856A525D",
    "CBC25F52-558D-47F7-9E34-CA5D350937E7",
    "04B8DACE-FDF8-443F-BDBA-47D53013854C",
    "760FDAEE-51EE-4B13-B56F-15A1FF830CC3",
    "7868E9CC-F249-4584-97A1-8DB1AE0BF655",
    "2B339F9B-B725-43B3-B8ED-2EB9B8E424BD",
    "7775E506-1D74-42AD-91B4-6851E8D2E583",
    "E59DA83E-695B-440C-B988-15418A795E4A",
    "BB69AEEF-1B04-40D3-BF3A-18E3FFC45F4E",
    "E74456B0-A80A-46B5-B60B-C6C2BBB3084F",
    "9BFADA33-D7AD-4835-8774-F9CA02A8119D",
    "FCC276F4-27E5-4BE6-9E8D-85102FC4A319",
    "366F10F7-BC7F-446A-975A-22C81CB275A3",
    "D4F75442-C232-4F5D-B9D4-BCE7BE9F14F0",
    "898272E3-BF51-4841-B907-6BDB1F6C46E5",
    "4EFC20E0-A607-4A1D-9269-D21474B77EE9",
    "4C8D2C1F-68B9-4BF6-95DC-4745B12AAC0D",
    "73F9E6AE-4C72-4D1A-A568-7561658F429F",
    "E35FA10A-938D-48B2-A36E-2907E39088D7",
    "0DEBA28A-BA92-4573-AA09-3B0D95CD2636",
    "5D395656-B743-4F5A-9B17-6C0465479100",
    "0581E382-75B4-4B58-8986-7B35F128FD4F",
    "8C23230C-CB4F-48D8-B374-8F236D2104FC",
    "5528E616-CE2D-4A35-AE26-C1F753363260",
    "1B5C814A-3B9B-4CCA-9461-C5BE2293549C",
    "3493315A-A6AD-4675-BF31-34ED19B45013",
    "B3E34711-6A71-49F0-A860-E3276C063FB5",
    "8F9330D5-9B47-4286-ACFA-B0EEA38DFDCB",
    "4799BAF0-AF77-4712-BAAD-0BDA7C032D71",
    "264ACA4B-B504-494D-A55B-A06E0F661F5D",
    "BA8FDBC2-715D-4489-92DA-1711FD35997A",
    "71AF703B-9936-459E-BE72-021D5D659A86",
    "079A64FA-22E2-4C95-A0B3-1348E770310F",
    "7D9DB2B8-953B-43BE-A933-7B7F008601C2",
    "A49D121F-90FD-491D-94C1-4B42C09F4EC7",
    "70780AC6-2B5E-42B4-80C1-93C2715C1D4E",
    "3BB0F311-CAA0-411C-AA94-81DA65C24D9B",
    "1A665DEB-7796-4155-A9C9-FE19C833068D",
    "44DE87D3-34D2-475F-ACD7-2EA6A8A8F618",
    "88A0965A-5ED2-4A4C-B326-72D0BA045598",
    "5336ED63-E2C8-4C6A-A970-E0A61265B49D",
    "56DC94AC-3FF7-4F6C-A35B-FF961F8391E1",
    "087D3D40-E9D7-47EF-AA3A-0DC81FE782FD",
    "D48E6CB2-029D-4170-95ED-6C623303E243",
    "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3",
    "D26621A5-D2CF-42BF-8A68-2E47B1AD2206",
    "13DFD9F9-2293-4B68-A7FE-C5729B7D574E",
    "AFF5A957-8869-46B4-B478-DFDEAD4A3659",
    "573C1A49-F555-407C-99E7-4629E15F67CC",
    "0E72BD82-8253-481D-80B2-35E0F8919E06",
    "750B250B-E120-4BAA-873E-4D12EC4F71D2",
    "4D89B7AC-D472-440F-AFCA-4F1D9D78768D",
    "A57E1D6D-2025-49A5-B3A6-BD223250A74E",
    "213A1D3A-5657-4F86-B71B-511E9DC23138",
    "15DE708D-0643-4E3A-BABD-F72B59C20753",
    "A27B7692-C5C0-4BE2-B46A-1288CD2F01F6",
    "5E54B872-D4A1-45D5-B8D4-913A78E28C0E",
    "3A1624D8-BE6D-4653-BEAB-616A808982FC",
    "FA63F082-6AAA-4B63-8C64-374108568413",
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
