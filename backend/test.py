import sys
import os
import logging
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.integrations.sat.billing_service import BillingService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(level=logging.INFO, format="%(message)s")


def cancelar_viejas_con_sustitucion():
    db = SessionLocal()
    pac = BillingService(db)

    # Formato: ("UUID_VIEJO_A_CANCELAR (Columna C)", "UUID_NUEVO_CHIDO (Columna B)")
    pares_cancelacion = [
        (
            "75834706-6320-4E26-BABA-3B3A7C8AF4AC",
            "B2E2B407-563B-42DB-939C-0548B05F981F",
        ),
        (
            "49100456-EF69-458B-84B5-8A20F5389BB0",
            "BE6CF903-F5DC-4692-925B-045B1771ABC2",
        ),
        (
            "E5E6964B-07C2-4365-9BD4-B6677DF35ED3",
            "3A4F7A92-8245-45FA-9F5C-DC8281A5E432",
        ),
        (
            "7DB87625-E8FE-4026-AC3D-AB61647B0B25",
            "163E7C95-BAC5-40B0-9AE7-BD1C19DE5CCF",
        ),
        (
            "73F9E6AE-4C72-4D1A-A568-7561658F429F",
            "3FC3E497-FB93-4EC7-A423-1BC76A5C105B",
        ),
        (
            "9F73FD07-B4A7-4699-A7EC-481BAA7496BE",
            "4A62DE14-CB01-4F66-B790-0F5FC09D30F5",
        ),
        (
            "725EA400-A4FB-4933-9FD1-7FA51ED4AF65",
            "4ABAD7E1-1356-41AF-99EB-6A500ED78A17",
        ),
        (
            "C9ECD3BD-A1EA-4CF0-9A26-95672D18E03D",
            "135B69E5-3EDE-432D-81FD-9A438504635B",
        ),
        (
            "FFE352ED-48AE-473C-9759-A17D50CBD9AF",
            "38F1C9A5-AE01-4EB0-B431-74BBC67C192A",
        ),
        (
            "81088AD1-5976-4FA0-B5F4-B1EAC4CF36F4",
            "25531FA0-A2A3-4BD9-B1B7-B91160DE4842",
        ),
        (
            "D20ABF05-85E6-4701-B066-3098B90FE295",
            "49A8BF38-DE68-44C2-810A-FC8B4D430B20",
        ),
        (
            "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF",
            "A7BD2256-A76E-4D3B-8771-31863EFDA81A",
        ),
        (
            "05A343AE-AFF2-4A1F-A06A-413FD49B3D16",
            "6CF5F0FD-59EC-47AA-BF6A-137CA4F0997F",
        ),
        (
            "16A13839-49E2-46D0-BE17-CB12360E1E49",
            "5CEB768B-E448-4375-B212-E412F11EFF4C",
        ),
        (
            "A249B360-E975-44B6-8144-5180940E74A0",
            "FCE3AC90-61A0-48EA-958E-3359A738F817",
        ),
        (
            "4327C425-4376-4892-BA11-49A4656602C7",
            "C27C4BA8-3EEF-4DC0-89D8-7D17BFD61313",
        ),
        (
            "0A262953-D74C-4019-8943-26218E8CFB30",
            "5C2B9380-7B55-48B2-BE92-F6D7BF4F1F05",
        ),
        (
            "7033B334-AC59-45FB-A86E-B4025549A9C9",
            "8063B247-F9C4-4197-9ABE-A16324F030FB",
        ),
        (
            "2A5ED0D3-F219-48AC-8C5C-1ACF0160E7BA",
            "E18B67B3-5862-4053-B8E1-0075BD31E682",
        ),
        (
            "E33E7737-7CDE-4B5B-BD9C-85631C548377",
            "AF13BC4A-9B1E-40B9-B4FD-A45669024817",
        ),
        (
            "C567C900-047C-4B0D-A0BE-F4446C2AE69A",
            "9A746BF0-9F2A-4297-B536-ABC2728F22E5",
        ),
        (
            "26D54643-486C-4FD3-89CC-79D7226494B1",
            "A0899277-BBE5-4A4F-9430-EC0E9B544632",
        ),
        (
            "26B39709-6189-4B17-9527-C14CBB1449BC",
            "5B232D1A-88CC-40DD-A66A-CB57EBCB04DC",
        ),
        (
            "A817227D-8797-416F-9D1B-183BA582EDC4",
            "D79A083E-D72F-4E78-B9BE-21CA5CD511B9",
        ),
        (
            "45B253B4-7A67-4387-AC0E-5C6E988A3095",
            "36EEFD93-2643-4659-8787-98B7D71BF691",
        ),
        (
            "0F1A3B0B-725E-4EEB-9D17-8F8D467B7BDF",
            "A22DC688-21B9-494A-8329-0650F8A177FE",
        ),
        (
            "2624E912-4210-46B4-86C1-AC9AEBA9E604",
            "83D726BC-40A0-4688-BE2A-E5ECE56812E5",
        ),
        (
            "9F9C4748-02A1-40C2-BDCD-6EF862C66B41",
            "A2979062-9F3C-4051-A7F8-0DC6227C7045",
        ),
        (
            "702735D6-8975-48A8-B8A9-1B61EC716AEE",
            "2765DBB4-229C-4C54-9BC1-41CC2129ED1A",
        ),
        (
            "4C88C059-5A76-4C8A-819F-897171E31838",
            "8C52BC13-1126-4B3A-A70D-C5DE64AF6D0B",
        ),
        (
            "9191A006-6079-4A87-9132-FE3625810571",
            "C02A3B10-892F-4DC6-85F3-D86CA8A5B073",
        ),
        (
            "519A26FB-3EA9-4A35-9CD7-7CE1709DC11A",
            "AF964D27-D1F5-433D-AF81-8659124F6603",
        ),
        (
            "33E794A4-8EA4-4F11-B274-248F0BA7E2AC",
            "7C7C6B24-13B9-4AF9-9DC8-B412BAE0E1FC",
        ),
        (
            "EF1E811E-A51E-4371-89CF-868D7F6681F4",
            "AB2DBA8B-0DC3-4B27-8BBD-14FE9E6F3AB4",
        ),
        (
            "C4EA4AB8-3DC4-4CFD-942E-735052420725",
            "9B15BE22-E81B-4976-BCA5-AB67999EF007",
        ),
        (
            "8E4B869D-0502-4BCF-8F31-BCA7300CF97B",
            "0961434E-FFD4-4B54-8527-57F2725B7282",
        ),
        (
            "4B1FAFED-3221-4485-8EFB-8C59AE062EC4",
            "0649E99C-AC5A-4FCE-8E6C-4FEC638C4FC2",
        ),
        (
            "72DC2B64-FCF2-4F10-95BE-573E149A54B3",
            "897FB0C9-BD6E-4C90-8D3A-E881A6C46D69",
        ),
        (
            "BC4C821C-BB34-47C4-944B-856A57F28201",
            "E550054C-02B6-42C7-8F95-32472B9BE63B",
        ),
        (
            "12EF2D29-7D04-4C87-81AD-768C743D4CEB",
            "148301C3-95A8-41E6-823D-6E142B9AD897",
        ),
        (
            "A4B6E278-4D46-45DF-9613-94F6D0FF19BD",
            "021187BA-D746-406D-813D-31A033B93E6C",
        ),
        (
            "097D2E77-8B28-4DFA-A9BA-F0D11C38FEBD",
            "FC0C12B1-A72B-46AB-B893-847275CB0217",
        ),
        (
            "D8E6D278-7F07-4BA0-B3A9-AFFE4F90AB01",
            "5910B228-0BD3-4646-AD51-0668B0D21478",
        ),
        (
            "9AC1FE06-4C15-44F0-9499-A2CE257E0415",
            "F89D535A-089B-4491-AFD9-FC0B49B835AB",
        ),
        (
            "48005C35-0984-4E2D-A755-EB2D852F15D0",
            "DB2D39C3-36C3-4296-9329-0577693B385A",
        ),
        (
            "E76A361D-5730-4BDB-9212-C692F45C2E04",
            "B597852D-1201-4B98-9BE2-48513C6B7EE9",
        ),
    ]

    print("===================================================================")
    print("🚀 CANCELANDO FACTURAS VIEJAS (MOTIVO 01 CON SUSTITUCIÓN)...")
    print("===================================================================\n")

    client_zeep = create_pac_client(pac.wsdl_timbrado, pac.history)

    with open(pac.path_cer, "rb") as f_cer:
        cer_bytes = f_cer.read()
    with open(pac.path_key, "rb") as f_key:
        key_bytes = f_key.read()

    from app.models.models import ReceivableInvoice

    for idx, (uuid_viejo, uuid_nuevo) in enumerate(pares_cancelacion, 1):
        print(
            f"[{idx}/46] 🔪 Cancelando vieja {uuid_viejo} (Sustituida por: {uuid_nuevo})"
        )

        # El PAC Solución Factible exige el formato "UUID_VIEJO|01|UUID_NUEVO"
        param_cancelacion = f"{uuid_viejo}|01|{uuid_nuevo}"

        try:
            resultado = client_zeep.service.cancelar(
                usuario=pac.pac_user,
                password=pac.pac_pass,
                uuids=[param_cancelacion],
                derCertCSD=cer_bytes,
                derKeyCSD=key_bytes,
                contrasenaCSD=pac.key_password,
            )

            res_sat = resultado.resultados[0]
            codigo = getattr(res_sat, "status", 0)
            mensaje = getattr(res_sat, "mensaje", "")

            if (
                codigo in [201, 202, 211]
                or "proceso" in mensaje.lower()
                or "previamente" in mensaje.lower()
            ):
                print(f"   ✅ ÉXITO: {mensaje}")
                # Marcamos la vieja como cancelada en la BD local
                db.query(ReceivableInvoice).filter(
                    ReceivableInvoice.uuid == uuid_viejo
                ).update(
                    {
                        "status_sat": (
                            "PROCESO_CANCELACION" if codigo != 202 else "CANCELADO"
                        ),
                        "estatus": "cancelado",
                    }
                )
                db.commit()
            else:
                print(f"   ❌ RECHAZO SAT: {mensaje} (Código: {codigo})")

        except Exception as e:
            print(f"   ⚠️ Error de conexión en este UUID: {str(e)}")

        time.sleep(1)

    db.close()
    print(
        "\n✅ PROCESO COMPLETADO. Las facturas viejas han sido enviadas a cancelar con el Motivo 01 correcto."
    )


if __name__ == "__main__":
    cancelar_viejas_con_sustitucion()
