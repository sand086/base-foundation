import sys
import os
import logging
import csv
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoice
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("cancelacion_forzada")

# =====================================================================
# 📌 MAPEO EXACTO REESTRUCTURADO
# =====================================================================
UUIDS_A_CANCELAR = [
    {
        "uuid": "7AA31279-208C-4818-A03F-2687B3DB5453",
        "motivo": "01",
        "sustitucion": "6675F9AF-1815-461F-9695-B98C12323EF0",
    },
    {
        "uuid": "74981B95-0CEA-4234-B1E8-0E782044D637",
        "motivo": "01",
        "sustitucion": "2253D8CB-8AAD-46E1-B201-77C7C6B6FEF3",
    },
    {
        "uuid": "5226154D-F0E3-471F-966F-9111BD55D36A",
        "motivo": "01",
        "sustitucion": "F205F53C-BB4B-4FA5-BD05-66B31CECE45F",
    },
    {
        "uuid": "976CC35B-A942-4268-9863-EC28F1325C37",
        "motivo": "01",
        "sustitucion": "A44918DE-2872-4397-A051-54943D5B2604",
    },
    {
        "uuid": "E28A54CB-160F-49B0-B9F0-187EC9853876",
        "motivo": "01",
        "sustitucion": "EFB472A6-2345-4633-9CFE-47D42DD1EC4B",
    },
    {
        "uuid": "298E0C44-796B-4762-9790-E4B2CC98DCD1",
        "motivo": "01",
        "sustitucion": "D0A101E0-2365-4865-8024-E7FF38148D0B",
    },
    {
        "uuid": "C18A5272-C2E0-45C7-BA78-8B89482E0A7B",
        "motivo": "01",
        "sustitucion": "49039DDE-7FE8-4191-B055-1BAFB1E1B4C5",
    },
    {
        "uuid": "F0D22952-49A7-4676-8D1C-284BCBBC91D9",
        "motivo": "01",
        "sustitucion": "E3948B03-3715-4389-BC73-66A64FB54CB8",
    },
    {
        "uuid": "F3608588-7D5B-427A-856E-6B2B35ECA22F",
        "motivo": "01",
        "sustitucion": "1AA75ECD-ACA2-4D0F-9554-31D8B217C009",
    },
    {
        "uuid": "3B835FFF-1771-4FD7-9E8F-BA2659DD3CCE",
        "motivo": "01",
        "sustitucion": "F65AB1BC-410D-44C2-BBB3-58672830BCD5",
    },
    {
        "uuid": "53EA3EAC-B50E-4D85-B926-497B03670FC3",
        "motivo": "01",
        "sustitucion": "D40515FB-5264-4B11-94CA-48909AA23CB2",
    },
    {
        "uuid": "A7FB21C8-6780-4B3E-8037-17AF97FA3571",
        "motivo": "01",
        "sustitucion": "86C13DAE-AE2C-4A35-9478-DD3FF587CD78",
    },
    {
        "uuid": "7C7EE265-5874-4010-AFFF-E1652FA5F30C",
        "motivo": "01",
        "sustitucion": "0FDD2CC0-ACFB-4D7E-A826-82D82426BDA7",
    },
    {
        "uuid": "C518FE8A-F285-4EC1-9F47-0ACD9A7EB147",
        "motivo": "01",
        "sustitucion": "27104C01-F027-4F20-8C28-FF95EBBD8865",
    },
    {
        "uuid": "C5F79D1B-11D9-4564-A2C0-959B01A4A99F",
        "motivo": "01",
        "sustitucion": "F331B28B-8FC2-4B89-8FEE-DA558FF139A9",
    },
    {
        "uuid": "1A5F770C-577E-4A2F-8CF2-E165EA676271",
        "motivo": "01",
        "sustitucion": "833AA261-DBCB-42CB-AC5F-3A82E40980F9",
    },
    {
        "uuid": "B37615D6-63EC-44EE-9CEA-71EA65079ED8",
        "motivo": "01",
        "sustitucion": "50E7F3E6-B204-42DA-845D-63B7406907F8",
    },
    {
        "uuid": "86154CC1-A1F8-469B-B0FD-DC06CC70B7F7",
        "motivo": "01",
        "sustitucion": "E7793F29-4A58-4FFC-AF42-DBAE6294968D",
    },
    {
        "uuid": "544357CC-60DA-4CA9-BEA5-B3646C7D5082",
        "motivo": "01",
        "sustitucion": "40A74F9B-5C8A-4B52-8752-D5D79474B48F",
    },
    {
        "uuid": "07044C90-ED18-4757-9E7F-876A5D6D9499",
        "motivo": "01",
        "sustitucion": "C7EA66AD-CE0F-45DB-BA43-785C5EA03A10",
    },
    {
        "uuid": "EC0951E5-B238-4D43-B17B-FC2979ECB94F",
        "motivo": "01",
        "sustitucion": "85449E9F-A5F2-4E15-9612-0D9EE4125FC2",
    },
    {
        "uuid": "9DD79D77-DE54-48DF-909B-030B5ACF40D9",
        "motivo": "01",
        "sustitucion": "99A5DAAB-B536-4AB1-8117-07AD40CB23FB",
    },
    {
        "uuid": "65756C2C-1070-4EC3-BAD3-8781171963E6",
        "motivo": "01",
        "sustitucion": "C61D7846-EA87-42C6-9802-CA10A4BC3689",
    },
    {
        "uuid": "018E3603-0213-41E7-ABC7-D94F5CD3C57E",
        "motivo": "01",
        "sustitucion": "698A3913-AF30-4283-A9E1-B704CEDD21D6",
    },
    {
        "uuid": "B8C0F0B3-B260-4BCB-B56A-643B915A8FD8",
        "motivo": "01",
        "sustitucion": "5D0BF8EF-0791-45AF-AABA-DC6604C0E032",
    },
    {
        "uuid": "D724C631-CB31-4F34-B168-44B33AF3A8A6",
        "motivo": "01",
        "sustitucion": "2BEEBF1C-947D-42B2-B783-0B5784C7A4EC",
    },
    {
        "uuid": "3FF006D4-4FCE-491A-90B8-77B29D2B304C",
        "motivo": "01",
        "sustitucion": "F558CC4B-6086-412A-8F4F-221C02D0FAF6",
    },
    {
        "uuid": "81BA15CF-23B1-4828-954E-C039D13EC224",
        "motivo": "01",
        "sustitucion": "AA1C4FC7-F82C-435B-8B93-549E6F73ECFA",
    },
    {
        "uuid": "997A4457-1E3E-401A-892F-CE64203321FB",
        "motivo": "01",
        "sustitucion": "900E7196-8DF8-4AEC-8197-9686C5120495",
    },
    {
        "uuid": "8FE1CC68-58AE-4BD2-B12E-BAA748C10B24",
        "motivo": "01",
        "sustitucion": "B436EB60-0F52-4122-BED1-BBE111F0A7E0",
    },
    {
        "uuid": "DBAFA7BE-5EEF-411E-8E84-F1545562F890",
        "motivo": "01",
        "sustitucion": "BC267A26-B37E-4E14-8A29-A4C9DC1B1F01",
    },
    {
        "uuid": "A82D34B9-222F-4235-8222-7EB99D12428A",
        "motivo": "01",
        "sustitucion": "1A5C709D-AC14-4C80-A2C4-A15624C2CAA3",
    },
    {
        "uuid": "75834706-6320-4E26-BABA-3B3A7C8AF4AC",
        "motivo": "01",
        "sustitucion": "B2E2B407-563B-42DB-939C-0548B05F981F",
    },
]


def disparar_cancelacion_sat():
    logger.info(
        f"Iniciando proceso de cancelación forzada para {len(UUIDS_A_CANCELAR)} UUIDs en el SAT..."
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"evidencia_cancelacion_{timestamp}.csv"

    db = SessionLocal()
    service = PaymentComplementService(db)

    try:
        with open(service.path_cer, "rb") as f_cer:
            cer_bytes = f_cer.read()
        with open(service.path_key, "rb") as f_key:
            key_bytes = f_key.read()

        logger.info(f"Conectando al PAC: {service.wsdl_timbrado}")
        client_zeep = create_pac_client(service.wsdl_timbrado, service.history)

        BATCH_SIZE = 50

        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(["Num_Lote", "UUID", "Status_SAT", "Mensaje_SAT"])

            for i in range(0, len(UUIDS_A_CANCELAR), BATCH_SIZE):
                num_lote = i // BATCH_SIZE + 1
                lote_dicts = UUIDS_A_CANCELAR[i : i + BATCH_SIZE]

                # Construir el array de cadenas inteligentemente
                lote_cadenas = []
                for item in lote_dicts:
                    if item["sustitucion"]:
                        # Si hay sustitución, van los 3 elementos
                        cadena = (
                            f"{item['uuid']}|{item['motivo']}|{item['sustitucion']}"
                        )
                    else:
                        # Si NO hay sustitución, solo mandamos 2 elementos (sin | al final)
                        cadena = f"{item['uuid']}|{item['motivo']}"

                    lote_cadenas.append(cadena)

                logger.info(f"Enviando lote {num_lote} ({len(lote_cadenas)} UUIDs)...")

                try:
                    resultado = client_zeep.service.cancelar(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        uuids=lote_cadenas,  # <-- Pasamos la lista limpia y directa
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
                            u_res = (
                                str(getattr(res, "uuid", "DESCONOCIDO")).strip().upper()
                            )
                            st_res = str(getattr(res, "status", "Sin Status"))
                            msg_res = str(
                                getattr(res, "mensaje", "Sin Mensaje")
                            ).lower()

                            print(f"UUID: {u_res}")
                            print(f"Status SAT: {st_res}")
                            print(f"Mensaje Hacienda: {msg_res}")
                            print("-" * 70)

                            # Actualización en BD
                            uuid_puro_busqueda = u_res.split("|")[0].strip()
                            factura = (
                                db.query(ReceivableInvoice)
                                .filter(ReceivableInvoice.uuid == uuid_puro_busqueda)
                                .first()
                            )

                            if factura:
                                if (
                                    "error" in msg_res
                                    or "no cancelable" in msg_res
                                    or "rechaz" in msg_res
                                    or st_res == "621"
                                ):
                                    factura.status_sat = "ERROR_CANCELACION"
                                    factura.estatus = "pendiente"
                                    factura.saldo_pendiente = float(
                                        factura.monto_total or 0
                                    )
                                    factura.detalle_sat = (
                                        f"Rechazo SAT ({st_res}): {msg_res}"
                                    )
                                    logger.error(
                                        f"❌ Rechazo SAT en UUID {uuid_puro_busqueda} -> {msg_res}"
                                    )
                                elif st_res == "201" or "proceso" in msg_res:
                                    factura.status_sat = "PROCESO_CANCELACION"
                                    factura.detalle_sat = (
                                        f"En proceso ante el SAT: {msg_res}"
                                    )
                                    factura.fecha_cancelacion = datetime.utcnow()
                                    logger.info(
                                        f"⏳ UUID {uuid_puro_busqueda} entró en proceso de cancelación."
                                    )
                                elif (
                                    st_res == "202"
                                    or "previamente cancelado" in msg_res
                                    or "ya se encuentra cancelado" in msg_res
                                    or (st_res == "200" and "exito" in msg_res)
                                ):
                                    factura.status_sat = "CANCELADO"
                                    factura.estatus = "cancelado"
                                    factura.saldo_pendiente = 0.0
                                    factura.detalle_sat = (
                                        f"Cancelación confirmada: {msg_res}"
                                    )
                                    factura.fecha_cancelacion = datetime.utcnow()
                                    logger.info(
                                        f"✅ UUID {uuid_puro_busqueda} marcado como CANCELADO en BD."
                                    )
                                else:
                                    factura.detalle_sat = (
                                        f"Respuesta SAT ({st_res}): {msg_res}"
                                    )

                                db.commit()
                            else:
                                logger.warning(
                                    f"⚠️ UUID {uuid_puro_busqueda} no fue encontrado en BD."
                                )

                            writer.writerow([num_lote, u_res, st_res, msg_res])
                    else:
                        logger.warning(
                            f"El PAC procesó el lote {num_lote} pero no devolvió desglose."
                        )

                except Exception as e_lote:
                    logger.error(f"❌ Error en Lote {num_lote}: {e_lote}")

        logger.info(f"📁 Evidencia guardada en: {csv_filename}")

    except Exception as e_general:
        logger.error(f"❌ Error fatal: {e_general}")
    finally:
        db.close()
        logger.info("Proceso terminado.")


if __name__ == "__main__":
    disparar_cancelacion_sat()
