import os
import sys
import time
import pandas as pd
import logging
from datetime import datetime

# 📌 Rutas absolutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("recuperar_acuses")

ARCHIVO_SALIDA = os.path.join(
    BASE_DIR, "libro_status_PAC_2026_ago_cancelados2_PARTE2.xlsx"
)

# 📋 Lista directa de los 91 UUIDs problemáticos
LISTA_UUIDS = [
    "637C4C6B-8656-4D3F-81FD-E3CAB9EED207",
    "F56357D4-2843-4F19-86B7-630ACAE90F0F",
    "02E690A1-F4AA-4451-904A-27A5EF5B8D8B",
    "5B881674-5695-403F-91CA-938B64C128EE",
    "B5D8E16B-8272-4CC7-9FFA-DC86E096884D",
    "9191A006-6079-4A87-9132-FE3625810571",
    "A817227D-8797-416F-9D1B-183BA582EDC4",
    "7C6C788B-315D-4C1B-88DA-0BFA005034BA",
    "BD51D748-D646-4F81-B69B-7214FF458EEF",
    "72DC2B64-FCF2-4F10-95BE-573E149A54B3",
    "1A5F770C-577E-4A2F-8CF2-E165EA676271",
    "C5F79D1B-11D9-4564-A2C0-959B01A4A99F",
    "C8F95015-5457-45BF-BB72-042DA9DCC72E",
    "D724C631-CB31-4F34-B168-44B33AF3A8A6",
    "5FBE3F6B-3E6A-4DB1-A660-13DA5E266DC5",
    "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF",
    "3C091D7A-66AB-4F3B-A619-2BD1348242DA",
    "26D54643-486C-4FD3-89CC-79D7226494B1",
    "7A428141-E4A3-4281-9757-9F4D4EA8A79E",
    "D71B9CFD-3835-4858-953A-3FD809D169BA",
    "02161AD1-CC24-4E77-A6B0-886EB7404CC3",
    "F14FDB3D-1035-4844-9B76-620B0BAB0506",
    "7868E9CC-F249-4584-97A1-8DB1AE0BF655",
    "E59DA83E-695B-440C-B988-15418A795E4A",
    "9BFADA33-D7AD-4835-8774-F9CA02A8119D",
    "366F10F7-BC7F-446A-975A-22C81CB275A3",
    "1093A3BB-F9F6-441E-B1C9-7F8946D70769",
    "3493315A-A6AD-4675-BF31-34ED19B45013",
    "96D28835-7B7F-49D2-99E0-9F143A11E00C",
    "8F9330D5-9B47-4286-ACFA-B0EEA38DFDCB",
    "079A64FA-22E2-4C95-A0B3-1348E770310F",
    "515AA91C-1A46-4F47-810D-2BB59B40480D",
    "8DCA8F7F-FAD8-4881-8E88-3A5DBBEAA04B",
    "0BF45367-4E3B-49E2-9712-CA4ED3B2F109",
    "B9AB3791-3BA9-4890-8EF4-8248D83862C8",
    "D96F87B6-E462-434F-AC73-DFAE315751C9",
    "C6917914-EF40-4905-B28A-397B276D1784",
    "25FF8C98-89DE-41D4-9871-75203D1443E1",
    "397BC61D-13DD-4BD2-A1AB-63EA416571D3",
    "41DF92DB-7F21-4EF5-ADF1-D8600E4AFF9F",
    "2EE8B653-66F7-4E30-BC3D-3C2E8C84E7EE",
    "26516325-08DD-4CAE-BBA3-177B65A0513D",
    "5EF8CB41-D2B3-45CB-B639-B79E1221D489",
    "2542D1E6-7F1A-4E15-B7BE-6E4D47411951",
    "1BB9B524-4371-45F2-B616-BB7F7F6D9511",
    "BD4DB6AC-31AE-4F48-B642-E349AC760686",
    "F298A866-2ECC-4AA8-9E1C-56BE5E2FF675",
    "65D8B780-E92B-481C-BFE1-1CF8AA47E43C",
    "D80039FC-5BC8-477F-B7CE-6A22BDB7150C",
    "1DA15C06-D01E-4C43-B2EE-D2B9C9E108AE",
    "E4BC993B-64A0-4CA4-A8FD-47DB78F6DE98",
    "CC660BD9-3F84-459F-9EDB-0E2770647C30",
    "B389B48C-CA2B-46DA-8958-94AA18FB583D",
    "2D1E9DB4-5B67-4FF0-8420-2321BDC7B194",
    "862E892E-EC99-47D2-B7D5-6C1785BCE285",
    "C828B34E-77EE-4847-8492-A57C858F86EE",
    "F95AEAC1-88F9-486C-8DA5-564EE8A92CE9",
    "BC6CC157-C3FD-4240-884F-EB7F055A6A63",
    "7A1B160C-63F4-4EF3-88B0-BE2E2ABADD8D",
    "B810309F-8023-4B83-A532-F3F8572EAF0A",
    "333B7A04-0BFF-4CB2-949B-66E7A2AF2391",
    "D26621A5-D2CF-42BF-8A68-2E47B1AD2206",
    "0DFBA215-6079-4EFD-878F-C69B660776F0",
    "D3FADA77-74BA-4955-A21B-85648F2C0F50",
    "ECC45264-BDD5-4D25-A090-4A40DBE5E73F",
    "3200DAC3-FE7F-41BA-91B3-7D55AEEF40AA",
    "01605075-9ADF-4706-820D-F9143E74B9C6",
    "B8062A05-AE1D-471C-84BE-43B73AD5509F",
    "07044C90-ED18-4757-9E7F-876A5D6D9499",
    "DFE4055A-00B0-414A-8FB1-36C47A2F7375",
    "13DFD9F9-2293-4B68-A7FE-C5729B7D574E",
    "8B7BD02B-E0AA-4CAE-8D75-7C04A917C27F",
    "C13CD8BF-BDBF-4DCA-AFAC-C371DFD49334",
    "2BF13386-2D34-43DA-864A-7D28D3F9AC25",
    "8BC84681-8922-40C9-9825-F07EA6DBB791",
    "3B835FFF-1771-4FD7-9E8F-BA2659DD3CCE",
    "6DD215FF-FB32-47A6-9654-1BB8862E8AFA",
    "EE603555-A325-44E2-B76B-71342DBDB8E7",
    "4D89B7AC-D472-440F-AFCA-4F1D9D78768D",
    "298E0C44-796B-4762-9790-E4B2CC98DCD1",
    "9BDEB0C3-52A2-4C71-982E-64C0F161103E",
    "F8B70181-E766-485B-BBF1-7231117689E3",
    "C19B200B-7C39-4410-9073-29F2DBAE2A9B",
    "DF98B571-A4EA-4A1D-B2C1-A294B2634CDF",
    "904B912B-6C14-4AC0-89AD-2FE9FCA51D42",
    "B00FAC00-887A-4F3B-B406-6C8BC1D58135",
    "46FB5CFA-208F-4989-BA4F-BFE47A33AE16",
    "FD76DB1B-3ACD-4C8C-9569-59DF0C784EE1",
    "EC42C5F7-5C30-4250-83BC-E94E16A07438",
    "BA684BF5-6453-4A8F-A526-7ECF8F1DC40E",
    "FA63F082-6AAA-4B63-8C64-374108568413",
]


def recuperar_acuses_desde_lista():
    # Inicializar Dataframe en memoria
    df = pd.DataFrame({"UUID": LISTA_UUIDS})

    for col in [
        "ESTATUS_ASINCRONO_PAC",
        "CODIGO_PAC",
        "MENSAJE_PAC",
        "ACUSE_SAT_ASINCRONO",
        "FECHA_CONSULTA_PARTE2",
    ]:
        df[col] = ""

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        # Cliente SOAP apuntando al WSDL asíncrono
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        total = len(df)
        logger.info(
            f"🚀 Iniciando EXTRACCIÓN ASÍNCRONA para los {total} UUIDs problemáticos..."
        )

        for idx, row in df.iterrows():
            uuid = str(row["UUID"]).strip()

            try:
                # 📡 Llamada directa al método asíncrono del PAC
                params_soap = {
                    "user": service.pac_user,
                    "pass": service.pac_pass,
                    "uuid": uuid,
                }

                try:
                    res = client_zeep.service.getStatusCancelacionAsincrona(
                        **params_soap
                    )
                except Exception:
                    res = client_zeep.service.getStatusCancelacionAsincrona(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        transactionId=uuid,
                    )

                status_code = getattr(res, "status", None)
                mensaje = getattr(res, "mensaje", "")
                acuse_sat = getattr(res, "acuseSAT", "")

                df.at[idx, "CODIGO_PAC"] = status_code
                df.at[idx, "MENSAJE_PAC"] = str(mensaje)
                if acuse_sat:
                    df.at[idx, "ACUSE_SAT_ASINCRONO"] = str(acuse_sat)
                df.at[idx, "FECHA_CONSULTA_PARTE2"] = datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                )

                # Interpretación Oficial del PAC para Asíncronos
                if status_code in [200, 201, 202]:
                    df.at[idx, "ESTATUS_ASINCRONO_PAC"] = "ACUSE_RECUPERADO"
                elif status_code == 211:
                    df.at[idx, "ESTATUS_ASINCRONO_PAC"] = "EN_PROCESO"
                elif status_code == 204:
                    df.at[idx, "ESTATUS_ASINCRONO_PAC"] = "NO_CANCELABLE"
                elif status_code == 702:
                    df.at[idx, "ESTATUS_ASINCRONO_PAC"] = (
                        "TRANSACCION_NO_ENCONTRADA (VIGENTE / ERROR SAT)"
                    )
                else:
                    df.at[idx, "ESTATUS_ASINCRONO_PAC"] = (
                        f"RESPUESTA_PAC ({status_code})"
                    )

                logger.info(
                    f"   ✅ UUID {uuid[:8]}... procesado (Código {status_code})"
                )

            except Exception as e:
                logger.error(
                    f"   ❌ Error de red en UUID {uuid[:8]}... : {str(e)[:50]}"
                )
                df.at[idx, "ESTATUS_ASINCRONO_PAC"] = "ERROR_CONSULTA"
                df.at[idx, "MENSAJE_PAC"] = str(e)

            # 💾 Guardar progreso
            if (idx + 1) % 10 == 0:
                df.to_excel(ARCHIVO_SALIDA, index=False)

            time.sleep(0.3)

        # Guardado final
        df.to_excel(ARCHIVO_SALIDA, index=False)
        logger.info(f"✅ ¡Proceso finalizado! Resultado generado en: {ARCHIVO_SALIDA}")

    except Exception as e_crit:
        logger.error(f"❌ Error crítico: {e_crit}")
    finally:
        db.close()


if __name__ == "__main__":
    recuperar_acuses_desde_lista()
