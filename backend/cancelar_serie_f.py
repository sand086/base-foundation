import sys
import os
import logging
import csv
from datetime import datetime

# Asegurar que el script encuentre la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoice, ReceivableInvoicePayment
from app.integrations.sat.payment_service import PaymentComplementService
from app.integrations.sat.soap_client import create_pac_client

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("cancelacion_forzada")

# =====================================================================
#  MAPEO: PRIMERO LOS HIJOS (PAGOS Y SUSTITUTAS), LUEGO LA CARTA PORTE
# =====================================================================
# =====================================================================
# 📌 MAPEO: PRIMERO LOS HIJOS (PAGOS Y SUSTITUTAS), LUEGO LA CARTA PORTE
# =====================================================================
UUIDS_A_CANCELAR = [
    {
        "uuid": "C340162A-5379-47DB-8DAE-6C5BACE83065",
        "motivo": "01",
        "sustitucion": "ED57C747-5FD8-40FE-971D-71B7D652D143",
    },  # CP-18485 sustituida por CP-18489
    {
        "uuid": "57CEB7A8-874F-432A-AF55-4A6506B0B356",
        "motivo": "01",
        "sustitucion": "ED57C747-5FD8-40FE-971D-71B7D652D143",
    },  # CP-18484 sustituida por CP-18489
    {
        "uuid": "2BD84D94-E321-4A79-B63B-8F79A5E9339E",
        "motivo": "01",
        "sustitucion": "0182F47A-1550-493E-803E-27CBB6F2DCCB",
    },  # CP-18424 sustituida por CP-18493
    {
        "uuid": "C61BE88B-0FA2-4816-878A-7B424E0E2DBB",
        "motivo": "01",
        "sustitucion": "0182F47A-1550-493E-803E-27CBB6F2DCCB",
    },  # CP-18433 sustituida por CP-18493
    {
        "uuid": "05BC2305-F01F-4487-8527-52286D3EACA9",
        "motivo": "01",
        "sustitucion": "64618668-7081-4393-B0CF-B2A315FDE55C",
    },  # CP-18421 sustituida por CP-18509
    {
        "uuid": "C0E38076-B9FE-46E5-9414-2F95ED95C437",
        "motivo": "01",
        "sustitucion": "64618668-7081-4393-B0CF-B2A315FDE55C",
    },  # CP-18508 sustituida por CP-18509
    {
        "uuid": "59121418-2E30-4EC1-BB79-80F276C4D4C9",
        "motivo": "01",
        "sustitucion": "64618668-7081-4393-B0CF-B2A315FDE55C",
    },  # CP-18507 sustituida por CP-18509
    {
        "uuid": "84984B8D-DCF7-45AC-B50F-0696ECE36C25",
        "motivo": "01",
        "sustitucion": "64618668-7081-4393-B0CF-B2A315FDE55C",
    },  # CP-18422 sustituida por CP-18509
    {
        "uuid": "6CFBA4A9-D97A-4808-A615-451992B2610C",
        "motivo": "01",
        "sustitucion": "064EFE17-9D7B-4663-A363-5B5E4B31D759",
    },  # CP-18459 sustituida por CP-18496
    {
        "uuid": "858CD9B6-DDF4-499F-89F7-8BDDAC12656B",
        "motivo": "01",
        "sustitucion": "064EFE17-9D7B-4663-A363-5B5E4B31D759",
    },  # CP-18452 sustituida por CP-18496
    {
        "uuid": "1EEC0FB5-46F5-4CC3-A2A0-55B0553FC93A",
        "motivo": "01",
        "sustitucion": "AFA23537-AD71-49E1-AEC6-213CCB8AF710",
    },  # CP-18408 sustituida por CP-18494
    {
        "uuid": "453ECD5A-830C-48DB-A39E-FCAA91EFE455",
        "motivo": "01",
        "sustitucion": "AFA23537-AD71-49E1-AEC6-213CCB8AF710",
    },  # CP-18420 sustituida por CP-18494
    {
        "uuid": "CB752187-7E8D-44D5-8321-B79C143DFFA4",
        "motivo": "01",
        "sustitucion": "AFA23537-AD71-49E1-AEC6-213CCB8AF710",
    },  # CP-18419 sustituida por CP-18494
    {
        "uuid": "A201FA12-5D52-4C16-A709-F1A010FBC1C5",
        "motivo": "01",
        "sustitucion": "DF63F52D-FCA9-4DBB-84C0-2500DBB92798",
    },  # CP-18440 sustituida por CP-18495
    {
        "uuid": "19C207DE-43C7-49CB-8DCF-B2433F8B00A0",
        "motivo": "01",
        "sustitucion": "DF63F52D-FCA9-4DBB-84C0-2500DBB92798",
    },  # CP-18439 sustituida por CP-18495
    {
        "uuid": "FAC2C828-F410-4EB0-AD61-A7FE584978EB",
        "motivo": "01",
        "sustitucion": "C224E6B9-F3F7-4970-9719-85ABDBED1EE9",
    },  # CP-18460 sustituida por CP-18502
    {
        "uuid": "383DFFA4-3747-468A-B135-3806654EA03D",
        "motivo": "01",
        "sustitucion": "C224E6B9-F3F7-4970-9719-85ABDBED1EE9",
    },  # CP-18407 sustituida por CP-18502
    {
        "uuid": "D0CA0DC6-C439-4A43-A33B-725A8AE16B3F",
        "motivo": "01",
        "sustitucion": "7F3497F0-B6CC-4A0C-9588-010638720602",
    },  # CP-18465 sustituida por CP-18491
    {
        "uuid": "68B12A1A-9F9D-45FE-A2BA-1BA8BF007D38",
        "motivo": "01",
        "sustitucion": "7F3497F0-B6CC-4A0C-9588-010638720602",
    },  # CP-18464 sustituida por CP-18491
    {
        "uuid": "15D9B3A6-7168-4617-9036-2AF4D058DF6F",
        "motivo": "01",
        "sustitucion": "BA649412-CAC7-42C7-B27B-D51B53F5148D",
    },  # CP-18469 sustituida por CP-18548
    {
        "uuid": "DCD1C7FD-7E35-4510-A11E-AB5118B3F093",
        "motivo": "01",
        "sustitucion": "BA649412-CAC7-42C7-B27B-D51B53F5148D",
    },  # CP-18514 sustituida por CP-18548
    {
        "uuid": "23374FC6-2E71-446C-B936-FE2405459522",
        "motivo": "01",
        "sustitucion": "BA649412-CAC7-42C7-B27B-D51B53F5148D",
    },  # CP-18513 sustituida por CP-18548
    {
        "uuid": "83399CF6-E7C1-42C3-B642-2820B513FDB0",
        "motivo": "01",
        "sustitucion": "A0E4A0D7-3B73-42CD-9888-10D3EA04D325",
    },  # CP-18454 sustituida por CP-18500
    {
        "uuid": "A565F211-4756-442C-BDAC-BD7A46F54AEC",
        "motivo": "01",
        "sustitucion": "A0E4A0D7-3B73-42CD-9888-10D3EA04D325",
    },  # CP-18473 sustituida por CP-18500
    {
        "uuid": "351F3816-D3F1-46A3-8F74-1052801A6AD1",
        "motivo": "01",
        "sustitucion": "737B9E75-17B2-40FB-AC8B-3E434E5CD7DA",
    },  # CP-18504 sustituida por CP-18559
    {
        "uuid": "4B522F76-90E8-42EE-86CC-1D67B4134DE8",
        "motivo": "01",
        "sustitucion": "737B9E75-17B2-40FB-AC8B-3E434E5CD7DA",
    },  # CP-18505 sustituida por CP-18559
    {
        "uuid": "3ECA0281-F268-46E8-8B38-5B9D022B8C05",
        "motivo": "01",
        "sustitucion": "737B9E75-17B2-40FB-AC8B-3E434E5CD7DA",
    },  # CP-18455 sustituida por CP-18559
    {
        "uuid": "123F30B7-404D-45BE-B60B-597518CCEF4A",
        "motivo": "01",
        "sustitucion": "170645FF-FB9F-438F-BE61-B66B15B20121",
    },  # CP-18426 sustituida por CP-18501
    {
        "uuid": "DB9413CB-117D-4F71-BA86-76C7E490E29D",
        "motivo": "01",
        "sustitucion": "170645FF-FB9F-438F-BE61-B66B15B20121",
    },  # CP-18458 sustituida por CP-18501
    {
        "uuid": "68FEE8B2-C454-459F-80D7-22ADA03081E7",
        "motivo": "01",
        "sustitucion": "E4F04AB1-C24F-4A4A-8606-2FD0AEC948D6",
    },  # CP-18457 sustituida por CP-18503
    {
        "uuid": "AAD9B5A9-DE5D-47C0-ABE8-D04D69604C85",
        "motivo": "01",
        "sustitucion": "0B55142E-3CCA-4F34-A6B7-B21CA7D99109",
    },  # CP-18415 sustituida por CP-18427
    {
        "uuid": "5E47E6D1-FAA0-42FA-9757-58926DB04768",
        "motivo": "01",
        "sustitucion": "B101CE03-44E4-415A-8002-222B405FB510",
    },  # CP-18414 sustituida por CP-18430
    {
        "uuid": "42EE00A4-7237-4315-8FF0-B76B001E98EB",
        "motivo": "01",
        "sustitucion": "B1199239-8BFF-424F-9BD7-80B9107CC943",
    },  # CP-18417 sustituida por CP-18429
    {
        "uuid": "8326E41D-CE9D-4570-8904-56150E92378E",
        "motivo": "01",
        "sustitucion": "B1199239-8BFF-424F-9BD7-80B9107CC943",
    },  # CP-18418 sustituida por CP-18429
    {
        "uuid": "BD2907CE-5EE2-4FD2-B4F4-3ED23B513E11",
        "motivo": "01",
        "sustitucion": "45BD7225-55EA-48B7-8DEB-33CEB5B8C746",
    },  # CP-18409 sustituida por CP-18431
    {
        "uuid": "50C7C0A8-3E89-425B-B1AB-196BD5CFA006",
        "motivo": "01",
        "sustitucion": "9F2302FE-B5AE-4071-B505-227F3EEAC440",
    },  # CP-18482 sustituida por CP-18490
    {
        "uuid": "8AF8EDD4-557D-459E-B19C-DBA98708BD06",
        "motivo": "01",
        "sustitucion": "9F2302FE-B5AE-4071-B505-227F3EEAC440",
    },  # CP-18456 sustituida por CP-18490
    {
        "uuid": "81FC2FF6-47C4-4E0F-8004-63919AE374A0",
        "motivo": "01",
        "sustitucion": "9F2302FE-B5AE-4071-B505-227F3EEAC440",
    },  # CP-18435 sustituida por CP-18490
    {
        "uuid": "7F829A59-FF0F-456C-80E0-836DA0EF1EE6",
        "motivo": "01",
        "sustitucion": "9F2302FE-B5AE-4071-B505-227F3EEAC440",
    },  # CP-18483 sustituida por CP-18490
    {
        "uuid": "4072F5D0-0088-4816-AA15-01D14EAB247C",
        "motivo": "01",
        "sustitucion": "56F0F57E-6E33-4BF8-BF0F-983BA2F6B27D",
    },  # CP-18416 sustituida por CP-18428
    {
        "uuid": "00ECFA8B-3C01-4911-BDD4-A7907EE56104",
        "motivo": "01",
        "sustitucion": "10718765-8E07-45CE-91E1-20B0E1EFFA70",
    },  # CP-18486 sustituida por CP-18488
    {
        "uuid": "8191BAD1-F6E2-47A4-B5E9-B1238B852394",
        "motivo": "01",
        "sustitucion": "10718765-8E07-45CE-91E1-20B0E1EFFA70",
    },  # CP-18448 sustituida por CP-18488
    {
        "uuid": "78C4094E-9092-4BCD-8453-E75C71E4DAF6",
        "motivo": "01",
        "sustitucion": "10718765-8E07-45CE-91E1-20B0E1EFFA70",
    },  # CP-18478 sustituida por CP-18488
    {
        "uuid": "34C8D7F2-B8FA-4B1D-BC6B-7F9D16B18862",
        "motivo": "01",
        "sustitucion": "10718765-8E07-45CE-91E1-20B0E1EFFA70",
    },  # CP-18434 sustituida por CP-18488
    {
        "uuid": "17CFE298-59CC-41F4-AB30-5E425859DEDB",
        "motivo": "01",
        "sustitucion": "CD82FC57-1653-4FF4-86CD-F60EF629C88C",
    },  # CP-18479 sustituida por CP-18487
    {
        "uuid": "CEAAC50C-60BE-4EAE-80D9-B1658431FFFE",
        "motivo": "01",
        "sustitucion": "CD82FC57-1653-4FF4-86CD-F60EF629C88C",
    },  # CP-18480 sustituida por CP-18487
    {
        "uuid": "3B79B520-48DF-4980-B126-4A9F6004D767",
        "motivo": "01",
        "sustitucion": "312DC507-652D-4534-977C-20E6CA05FA8D",
    },  # CP-18538 sustituida por CP-18545
    {
        "uuid": "C8AD46CC-A6F9-4613-B297-6AE32383D9A7",
        "motivo": "01",
        "sustitucion": "312DC507-652D-4534-977C-20E6CA05FA8D",
    },  # CP-18497 sustituida por CP-18545
    {
        "uuid": "99D530D5-126E-44D9-B020-8133EF57495C",
        "motivo": "01",
        "sustitucion": "9924F214-01D3-4E7E-9057-6F2F7DFB0BC7",
    },  # CP-18550 sustituida por CP-18551
    {
        "uuid": "3734AE63-4F5F-4551-91DD-B27A83E7815F",
        "motivo": "01",
        "sustitucion": "9924F214-01D3-4E7E-9057-6F2F7DFB0BC7",
    },  # CP-18549 sustituida por CP-18551
    {
        "uuid": "0B44F0E3-CD9A-4610-95E7-55FC2BFD01BD",
        "motivo": "01",
        "sustitucion": "9924F214-01D3-4E7E-9057-6F2F7DFB0BC7",
    },  # CP-18438 sustituida por CP-18551
    {
        "uuid": "4B1B065F-1863-480E-BE4D-12C24C83E1F1",
        "motivo": "01",
        "sustitucion": "9924F214-01D3-4E7E-9057-6F2F7DFB0BC7",
    },  # CP-18437 sustituida por CP-18551
    {
        "uuid": "ABAF5260-AFEE-435C-B81C-41C62E237854",
        "motivo": "01",
        "sustitucion": "9924F214-01D3-4E7E-9057-6F2F7DFB0BC7",
    },  # CP-18447 sustituida por CP-18551
    {
        "uuid": "C46B5F0E-DB7A-4246-8B00-9A98F6F02E16",
        "motivo": "01",
        "sustitucion": "9924F214-01D3-4E7E-9057-6F2F7DFB0BC7",
    },  # CP-18436 sustituida por CP-18551
    {
        "uuid": "597AD592-7F08-43A8-8CBF-84F399BCA043",
        "motivo": "01",
        "sustitucion": "9924F214-01D3-4E7E-9057-6F2F7DFB0BC7",
    },  # CP-18446 sustituida por CP-18551
    {
        "uuid": "AA2DFFBF-A35E-48A9-B5C1-85709939040D",
        "motivo": "01",
        "sustitucion": "69AF7B9A-D6BA-4788-AD1B-7FB365FFEE55",
    },  # CP-18537 sustituida por CP-18546
    {
        "uuid": "8AEE0325-D35A-4698-A53D-728EF6D90D0E",
        "motivo": "01",
        "sustitucion": "69AF7B9A-D6BA-4788-AD1B-7FB365FFEE55",
    },  # CP-18499 sustituida por CP-18546
    {
        "uuid": "4FF09221-1796-4AE8-A19C-18EF1CED4493",
        "motivo": "01",
        "sustitucion": "4607DE24-0BDB-4743-81EB-740947E25D5F",
    },  # CP-18532 sustituida por CP-18547
    {
        "uuid": "C5B59282-2FEB-4FF6-AA4D-A9B639969E25",
        "motivo": "01",
        "sustitucion": "4607DE24-0BDB-4743-81EB-740947E25D5F",
    },  # CP-18498 sustituida por CP-18547
    {
        "uuid": "4C659880-B313-44CD-ADB3-ADF3779AC28E",
        "motivo": "01",
        "sustitucion": "6E9EF9CA-B338-4DFA-80AE-0B07980BFA17",
    },  # CP-18463 sustituida por CP-18492
    {
        "uuid": "ED6BFDF0-CE8E-4CD0-97C5-26E9F39F8A9D",
        "motivo": "01",
        "sustitucion": "6E9EF9CA-B338-4DFA-80AE-0B07980BFA17",
    },  # CP-18425 sustituida por CP-18492
    {
        "uuid": "831223C3-B209-4E8B-B442-F091FD4ABF9F",
        "motivo": "01",
        "sustitucion": "6E9EF9CA-B338-4DFA-80AE-0B07980BFA17",
    },  # CP-18462 sustituida por CP-18492
    {
        "uuid": "0E05A6B6-CE1B-44E0-98A1-D6FA14E636B5",
        "motivo": "01",
        "sustitucion": "1E1EA3C1-6464-4174-A50B-44A02DD29141",
    },  # CP-18554 sustituida por CP-18555
    {
        "uuid": "A102FEA4-A016-43C9-B4FC-33D9F57F4CD5",
        "motivo": "01",
        "sustitucion": "1E1EA3C1-6464-4174-A50B-44A02DD29141",
    },  # CP-18472 sustituida por CP-18555
    {
        "uuid": "AE37A32A-059E-42CF-A4FA-76B069A94E3A",
        "motivo": "01",
        "sustitucion": "1E1EA3C1-6464-4174-A50B-44A02DD29141",
    },  # CP-18471 sustituida por CP-18555
    {
        "uuid": "309B97B7-59B8-4E25-B451-3217B24A30BE",
        "motivo": "01",
        "sustitucion": "1E1EA3C1-6464-4174-A50B-44A02DD29141",
    },  # CP-18553 sustituida por CP-18555
    {
        "uuid": "0007CB11-8AC9-40D6-9302-4FC4F047BAEB",
        "motivo": "01",
        "sustitucion": "C8859F20-7742-42D3-B404-CAEAEDD1BAFB",
    },  # CP-18453 sustituida por CP-18552
    {
        "uuid": "CDF77E2F-654A-4E33-B288-F1D132224E67",
        "motivo": "01",
        "sustitucion": "C8859F20-7742-42D3-B404-CAEAEDD1BAFB",
    },  # CP-18512 sustituida por CP-18552
    {
        "uuid": "8F155448-2BB5-4941-8396-FD896E5D68B3",
        "motivo": "01",
        "sustitucion": "C8859F20-7742-42D3-B404-CAEAEDD1BAFB",
    },  # CP-18511 sustituida por CP-18552
    {
        "uuid": "886CBF5C-C28B-4430-BA3C-2019CA140419",
        "motivo": "01",
        "sustitucion": "7596475C-EF40-45C4-BBC5-EF406147422C",
    },  # CP-18530 sustituida por CP-18558
    {
        "uuid": "60D17D94-DFAF-4B75-9D59-34C43C875316",
        "motivo": "01",
        "sustitucion": "7596475C-EF40-45C4-BBC5-EF406147422C",
    },  # CP-18557 sustituida por CP-18558
    {
        "uuid": "EB9DE2E5-23AC-4C9A-978F-BEC292235E91",
        "motivo": "01",
        "sustitucion": "7596475C-EF40-45C4-BBC5-EF406147422C",
    },  # CP-18556 sustituida por CP-18558
    {
        "uuid": "F52C4371-F914-4DE3-B542-E2DD7DBCEF7C",
        "motivo": "01",
        "sustitucion": "7596475C-EF40-45C4-BBC5-EF406147422C",
    },  # CP-18531 sustituida por CP-18558
    {
        "uuid": "DC447689-049A-4CBC-8CB3-879EBDDCCF60",
        "motivo": "01",
        "sustitucion": "7596475C-EF40-45C4-BBC5-EF406147422C",
    },  # CP-18510 sustituida por CP-18558
    {
        "uuid": "25EB7F9D-D25E-40F8-9883-6FD8622AB3B5",
        "motivo": "01",
        "sustitucion": "47E7F1F2-7B79-4751-B99F-B5EC8E964444",
    },  # CP-18475 sustituida por CP-18561
    {
        "uuid": "FCECF6B6-0170-4070-84FE-20258395FFE4",
        "motivo": "01",
        "sustitucion": "47E7F1F2-7B79-4751-B99F-B5EC8E964444",
    },  # CP-18449 sustituida por CP-18561
]


def disparar_cancelacion_sat():
    logger.info(
        f"Iniciando proceso de cancelación individual para {len(UUIDS_A_CANCELAR)} UUIDs..."
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

        # ✅ LÍNEA CORREGIDA
        with open(csv_filename, mode="w", newline="", encoding="utf-8") as f_csv:
            writer = csv.writer(f_csv)
            writer.writerow(["UUID", "Status_SAT", "Mensaje_SAT"])

            for item in UUIDS_A_CANCELAR:
                if item["sustitucion"]:
                    cadena = f"{item['uuid']}|{item['motivo']}|{item['sustitucion']}"
                else:
                    cadena = f"{item['uuid']}|{item['motivo']}"

                logger.info(f"🚀 Enviando al SAT: {cadena}")

                try:
                    resultado = client_zeep.service.cancelar(
                        usuario=service.pac_user,
                        password=service.pac_pass,
                        uuids=[cadena],
                        derCertCSD=cer_bytes,
                        derKeyCSD=key_bytes,
                        contrasenaCSD=service.key_password,
                    )

                    if hasattr(resultado, "resultados") and resultado.resultados:
                        res = resultado.resultados[0]
                        u_res = str(getattr(res, "uuid", item["uuid"])).strip().upper()
                        st_res = str(getattr(res, "status", "Sin Status"))
                        msg_res = str(getattr(res, "mensaje", "Sin Mensaje")).lower()

                        logger.info(
                            f"   SAT Respondió -> Código: {st_res} | Mensaje: {msg_res}"
                        )

                        uuid_puro_busqueda = u_res.split("|")[0].strip()

                        # ------------------------------------------------------------------
                        # 🕵️‍♂️ BÚSQUEDA INTELIGENTE EN BD (Busca en facturas y si no, en pagos)
                        # ------------------------------------------------------------------
                        es_pago = False
                        documento = (
                            db.query(ReceivableInvoice)
                            .filter(ReceivableInvoice.uuid == uuid_puro_busqueda)
                            .first()
                        )

                        if not documento:
                            documento = (
                                db.query(ReceivableInvoicePayment)
                                .filter(
                                    ReceivableInvoicePayment.complemento_uuid
                                    == uuid_puro_busqueda
                                )
                                .first()
                            )
                            es_pago = True

                        if documento:
                            if (
                                "error" in msg_res
                                or "no cancelable" in msg_res
                                or "rechaz" in msg_res
                                or st_res in ["500", "621"]
                            ):
                                if es_pago:
                                    documento.estatus = "ACTIVO"
                                else:
                                    documento.status_sat = "ERROR_CANCELACION"
                                    documento.estatus = "pendiente"
                                    documento.saldo_pendiente = float(
                                        documento.monto_total or 0
                                    )

                                documento.detalle_sat = (
                                    f"Rechazo/Error SAT ({st_res}): {msg_res}"
                                )
                                logger.error(f"   ❌ Rechazo/Error guardado en BD.")

                            elif st_res == "201" or "proceso" in msg_res:
                                if es_pago:
                                    documento.estatus = "PROCESO_CANCELACION"
                                else:
                                    documento.status_sat = "PROCESO_CANCELACION"

                                documento.detalle_sat = (
                                    f"En proceso ante el SAT: {msg_res}"
                                )
                                documento.fecha_cancelacion = datetime.utcnow()
                                logger.info(f"   ⏳ En proceso guardado en BD.")

                            elif (
                                st_res == "202"
                                or "previamente cancelado" in msg_res
                                or "ya se encuentra cancelado" in msg_res
                                or (st_res == "200" and "exito" in msg_res)
                            ):
                                if es_pago:
                                    documento.estatus = "CANCELADO"
                                else:
                                    documento.status_sat = "CANCELADO"
                                    documento.estatus = "cancelado"
                                    documento.saldo_pendiente = 0.0

                                documento.detalle_sat = (
                                    f"Cancelación confirmada: {msg_res}"
                                )
                                documento.fecha_cancelacion = datetime.utcnow()
                                logger.info(f"   ✅ Éxito guardado en BD.")
                            else:
                                documento.detalle_sat = (
                                    f"Respuesta SAT ({st_res}): {msg_res}"
                                )

                            db.commit()
                        else:
                            logger.warning(
                                f"   ⚠️ UUID {uuid_puro_busqueda} no encontrado ni en Facturas ni en Pagos en la BD."
                            )

                        writer.writerow([u_res, st_res, msg_res])
                    else:
                        logger.warning(
                            f"   ⚠️ El PAC no devolvió desglose para {item['uuid']}"
                        )

                except Exception as e_indiv:
                    logger.error(f"   ❌ Error al procesar {item['uuid']}: {e_indiv}")

        logger.info(f"📁 Evidencia guardada en: {csv_filename}")

    except Exception as e_general:
        logger.error(f"❌ Error fatal: {e_general}")
    finally:
        db.close()
        logger.info("Proceso terminado.")


if __name__ == "__main__":
    disparar_cancelacion_sat()
