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
    "3D26A393-07BC-4B0F-B761-DBC82B54CF7D",
    "F0674A43-8CDF-4E0D-9B2A-1E2BB2D2E4FF",
    "DBAFA7BE-5EEF-411E-8E84-F1545562F890",
    "6054E1BE-C706-4426-9F69-3FEEC70D15ED",
    "FD1C3C2E-92BD-4206-B980-8CBB7C398EED",
    "42182F68-42B2-4CEA-ABF2-10426766B15B",
    "F1E9E9FF-A590-4419-BEF7-8D9BC187D0EB",
    "5B881674-5695-403F-91CA-938B64C128EE",
    "1E64CC95-043E-477F-9EAE-463068A64344",
    "FC3767B6-CFAB-48EC-B50D-8D26B6601EB6",
    "223EA461-3046-455D-BA5D-C14AD45B7F71",
    "5B9CE43A-5E09-4BF9-9A99-8FB432DD5C61",
    "1BBA56FB-B809-4FF9-B5D5-96102ECA84DB",
    "48F53943-5CAB-4EFE-B170-A48635F5A168",
    "FCB93938-C29E-44B7-84AB-E941507DFC0E",
    "6893C9DA-A64D-4937-BB42-C3D36A49EB24",
    "1318C90A-B6AA-4F79-929B-AAF3B4D40F69",
    "E76A361D-5730-4BDB-9212-C692F45C2E04",
    "1F22BA49-6674-4089-A92B-F34189A7FD64",
    "48005C35-0984-4E2D-A755-EB2D852F15D0",
    "BC4C821C-BB34-47C4-944B-856A57F28201",
    "9191A006-6079-4A87-9132-FE3625810571",
    "A817227D-8797-416F-9D1B-183BA582EDC4",
    "26B39709-6189-4B17-9527-C14CBB1449BC",
    "EDFF2775-7D63-4357-9D69-13D52ACD4F6D",
    "33E794A4-8EA4-4F11-B274-248F0BA7E2AC",
    "9AC1FE06-4C15-44F0-9499-A2CE257E0415",
    "A9DFAFF2-B2D8-43E1-B038-6E0DA9EB9F9D",
    "D8E6D278-7F07-4BA0-B3A9-AFFE4F90AB01",
    "42BD0A41-27DD-4A08-9A5A-48155566722B",
    "BD51D748-D646-4F81-B69B-7214FF458EEF",
    "5226154D-F0E3-471F-966F-9111BD55D36A",
    "8E4B869D-0502-4BCF-8F31-BCA7300CF97B",
    "519A26FB-3EA9-4A35-9CD7-7CE1709DC11A",
    "C4CB5888-C7EA-4AD9-AA56-C2497D9849C5",
    "4B1FAFED-3221-4485-8EFB-8C59AE062EC4",
    "097D2E77-8B28-4DFA-A9BA-F0D11C38FEBD",
    "A4B6E278-4D46-45DF-9613-94F6D0FF19BD",
    "A249B360-E975-44B6-8144-5180940E74A0",
    "99D20D2A-C7B3-4AFC-93D9-5A31AF257830",
    "72DC2B64-FCF2-4F10-95BE-573E149A54B3",
    "27106A91-48C4-49FA-A077-255E1A337EEA",
    "C5F79D1B-11D9-4564-A2C0-959B01A4A99F",
    "AF0BCC30-7736-4744-9C5F-E79632054D5D",
    "12EF2D29-7D04-4C87-81AD-768C743D4CEB",
    "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF",
    "9F73FD07-B4A7-4699-A7EC-481BAA7496BE",
    "16A13839-49E2-46D0-BE17-CB12360E1E49",
    "C9ECD3BD-A1EA-4CF0-9A26-95672D18E03D",
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
    "5D395656-B743-4F5A-9B17-6C0465479100",
    "0581E382-75B4-4B58-8986-7B35F128FD4F",
    "8F9330D5-9B47-4286-ACFA-B0EEA38DFDCB",
    "264ACA4B-B504-494D-A55B-A06E0F661F5D",
    "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3",
    "A57E1D6D-2025-49A5-B3A6-BD223250A74E",
    "15DE708D-0643-4E3A-BABD-F72B59C20753",
    "3A1624D8-BE6D-4653-BEAB-616A808982FC",
    "1A5F3059-EB89-4639-87A5-54A41DC69F6B",
]

UUIDS_NO_CANCELABLES = [
    "16693ED9-532A-45F5-9FD1-C5C8FE12AA75",
    "98876639-F013-401C-A2C9-79317CD7EEF9",
    "9307535A-7254-46FC-A6E4-A6AC9BFF9A85",
    "16693ED9-532A-45F5-9FD1-C5C8FE12AA75",
    "98876639-F013-401C-A2C9-79317CD7EEF9",
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
    "8BCE0767-8E14-46D0-BEED-3ACDEEE63BCA",
    "A5E54B3A-0E7D-49BA-9AA1-F71E11EF8227",
    "BA874132-16A5-4594-9140-CC6311B3613F",
    "BD71967A-342B-49E0-AC6B-8FAAC566E1F4",
    "C661CD16-0BED-444B-8F46-9F7A4FA65ABD",
    "CB6C196B-EF18-43A4-8A8E-8A7DEF3288F9",
    "DAEFAC9C-0D7B-4017-915A-5741A0FE350E",
    "DEBB5EDC-FAD4-48EA-BCB6-BF28B61D8F2D",
    "E9104B7B-53F9-4376-BB33-99FACD58BF28",
    "9307535A-7254-46FC-A6E4-A6AC9BFF9A85",
    "282E2B87-D04D-4CDC-93CC-B49D30D5AC4B",
    "37551337-67D0-436E-8045-AC8044449066",
    "8C59F132-4BF4-4E69-A21F-1C3B246F4339",
    "95793C05-6F47-4B7D-8F0C-C97718B08627",
    "B7648014-0047-4FF6-BF90-8BAF63702B42",
    "CE75F2A6-B285-4ABD-B944-48A738E8F23B",
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
