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
    "8FE1CC68-58AE-4BD2-B12E-BAA748C10B24",
    "B32BA25F-E1ED-4D22-9636-08095C33D039",
    "D34D867F-BB54-405F-A076-269884558F7F",
    "5B9CE43A-5E09-4BF9-9A99-8FB432DD5C61",
    "1BBA56FB-B809-4FF9-B5D5-96102ECA84DB",
    "48F53943-5CAB-4EFE-B170-A48635F5A168",
    "ABD09539-C9E7-4B6B-8703-76F7FDDC67D2",
    "FCB93938-C29E-44B7-84AB-E941507DFC0E",
    "8CAA31EE-B727-4D70-9949-C597C0D99BC8",
    "837E0838-A5F6-4CD9-9232-7CA259F78CF4",
    "374C6D9F-DC4E-417F-A6EB-80E24DB508C8",
    "2F6CC01B-4939-40F7-9D66-495F38D10F06",
    "6893C9DA-A64D-4937-BB42-C3D36A49EB24",
    "10DC457F-400D-4752-BF9E-B7C8C37270BA",
    "776276C9-FECA-44B3-A04E-0503823DA572",
    "1318C90A-B6AA-4F79-929B-AAF3B4D40F69",
    "2F975774-A056-4214-B5F6-8C3A87A3D63A",
    "E76A361D-5730-4BDB-9212-C692F45C2E04",
    "A7FB21C8-6780-4B3E-8037-17AF97FA3571",
    "075B6A03-FFC7-4838-A774-BE61185B09E9",
    "E07270FD-931B-4CEB-ABC2-913B5E375818",
    "1F22BA49-6674-4089-A92B-F34189A7FD64",
    "48005C35-0984-4E2D-A755-EB2D852F15D0",
    "598A9101-F779-4251-B18B-EE117C11F5C8",
    "641F9D96-05A6-4858-9377-3DEF61CB7326",
    "BC4C821C-BB34-47C4-944B-856A57F28201",
    "B5D8E16B-8272-4CC7-9FFA-DC86E096884D",
    "9191A006-6079-4A87-9132-FE3625810571",
    "B5B7CDAA-295F-4187-9CC6-5A164361AB69",
    "AB9491A2-BC63-4C43-A7E9-269D0AEA0C86",
    "DE753175-7F2A-46AE-9B7F-9272362F85B0",
    "A817227D-8797-416F-9D1B-183BA582EDC4",
    "7C6C788B-315D-4C1B-88DA-0BFA005034BA",
    "26B39709-6189-4B17-9527-C14CBB1449BC",
    "EDFF2775-7D63-4357-9D69-13D52ACD4F6D",
    "81BA15CF-23B1-4828-954E-C039D13EC224",
    "E1579A1B-B647-4C1D-9A81-1FEE1F03918E",
    "FC8B6A14-BBED-454B-B305-E4F6FB3918FA",
    "03BC3484-EBC0-46C1-A26E-57C3E9CEAEC5",
    "CF8FE8E3-44D5-499A-B9EF-59349F831A7F",
    "33E794A4-8EA4-4F11-B274-248F0BA7E2AC",
    "A467710D-820F-49DB-B1D9-5320BA802BEE",
    "30F44D7F-BE02-459E-9D0C-70FE689DA64D",
    "9AC1FE06-4C15-44F0-9499-A2CE257E0415",
    "A9DFAFF2-B2D8-43E1-B038-6E0DA9EB9F9D",
    "D8E6D278-7F07-4BA0-B3A9-AFFE4F90AB01",
    "1E68B705-CB5A-4B30-8D7C-94DED0DD3B2C",
    "42BD0A41-27DD-4A08-9A5A-48155566722B",
    "B4A25E94-7380-422D-A235-9A739DF0FC85",
    "3B92EBA2-CB05-4284-90F7-93671EB800DC",
    "A82D34B9-222F-4235-8222-7EB99D12428A",
    "BD51D748-D646-4F81-B69B-7214FF458EEF",
    "5226154D-F0E3-471F-966F-9111BD55D36A",
    "F31B2580-52CC-41D0-A2BA-6DC56E2DFCE0",
    "8E4B869D-0502-4BCF-8F31-BCA7300CF97B",
    "519A26FB-3EA9-4A35-9CD7-7CE1709DC11A",
    "C4CB5888-C7EA-4AD9-AA56-C2497D9849C5",
    "4B1FAFED-3221-4485-8EFB-8C59AE062EC4",
    "AA9202A6-FFBC-4C12-A9FA-CA0CAFAA0C5C",
    "84A0612F-EFC7-4B45-8CF8-08D2DDE23A8C",
    "097D2E77-8B28-4DFA-A9BA-F0D11C38FEBD",
    "5EC06EB7-2921-4398-AAB7-A70C55D8BC1B",
    "A4B6E278-4D46-45DF-9613-94F6D0FF19BD",
    "E6828864-0CB1-4B75-B7EF-F9A7BCCEE58E",
    "A9F6DC98-13D3-4B74-9ADD-DE58EEC0DBF0",
    "A249B360-E975-44B6-8144-5180940E74A0",
    "99D20D2A-C7B3-4AFC-93D9-5A31AF257830",
    "72DC2B64-FCF2-4F10-95BE-573E149A54B3",
    "96B515C9-3386-45DA-B666-35ACF848772F",
    "27106A91-48C4-49FA-A077-255E1A337EEA",
    "04604546-A5E2-4531-8B0A-655DF8B33136",
    "0AD509FA-E91A-4DFA-A79D-16DC6C0552F7",
    "1A5F770C-577E-4A2F-8CF2-E165EA676271",
    "C5F79D1B-11D9-4564-A2C0-959B01A4A99F",
    "AF0BCC30-7736-4744-9C5F-E79632054D5D",
    "C8F95015-5457-45BF-BB72-042DA9DCC72E",
    "A5FB8379-6804-47EA-A6DF-DA4A769EC61A",
    "5AEB8589-E4EB-4709-AD1C-170817F17D94",
    "91BFE34B-D936-405F-AE45-576D5CE1045F",
    "D8B2C1D3-D9F3-4771-A6E2-0AA4C1F8E02E",
    "543D718A-0C91-42B4-84B4-A793850080AC",
    "C2A1AFC5-C6A6-48B8-AED6-12B065B01D52",
    "5D0EF874-6A37-45A8-80F7-1E7782C3F9F5",
    "22BD62C0-770C-4566-B7A3-1DD1E38758D2",
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
