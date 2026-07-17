import sys
import os
from io import BytesIO
from lxml import etree
import qrcode

# Aseguramos el entorno
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.database import SessionLocal
from app.integrations.sat.payment_service import PaymentComplementService

try:
    from num2words import num2words

    HAS_NUM2WORDS = True
except ImportError:
    HAS_NUM2WORDS = False


def regenerar_pdf(folio: str):
    db = SessionLocal()
    service = PaymentComplementService(db)

    # 1. Obtener el UUID de la base de datos usando el folio
    from app.models.models import ReceivableInvoicePayment

    pago = (
        db.query(ReceivableInvoicePayment)
        .filter(ReceivableInvoicePayment.folio_complemento == folio)
        .first()
    )

    if not pago or not pago.complemento_uuid:
        print(f"❌ No se encontró un UUID válido timbrado para el folio {folio}")
        return

    uuid_pago = pago.complemento_uuid
    print(f"📄 UUID encontrado: {uuid_pago}")

    # 2. Leer el XML timbrado desde el disco
    xml_path_upper = service.storage_dir / f"{uuid_pago.upper()}.xml"
    xml_path_lower = service.storage_dir / f"{uuid_pago.lower()}.xml"
    xml_path = xml_path_upper if xml_path_upper.exists() else xml_path_lower

    if not xml_path.exists():
        print(f"❌ No se encontró el XML físico en {xml_path}")
        return

    with open(xml_path, "rb") as f:
        cfdi_bytes = f.read()

    root = etree.fromstring(cfdi_bytes)
    ns = {
        "cfdi": "http://www.sat.gob.mx/cfd/4",
        "pago20": "http://www.sat.gob.mx/Pagos20",
        "tfd": "http://www.sat.gob.mx/TimbreFiscalDigital",
    }

    comprobante = root
    emisor = root.find("cfdi:Emisor", ns)
    receptor = root.find("cfdi:Receptor", ns)
    complemento = root.find("cfdi:Complemento", ns)
    pagos_node = complemento.find("pago20:Pagos", ns)
    pago_node = pagos_node.find("pago20:Pago", ns)

    # 3. Extraer datos DIRECTAMENTE DEL XML (Para que la moneda venga como MXN puro)
    monto_total = pago_node.get("Monto")

    doctos_relacionados = []
    for doc in pago_node.findall("pago20:DoctoRelacionado", namespaces=ns):
        doctos_relacionados.append(
            {
                "uuid": doc.get("IdDocumento"),
                "serie": doc.get("Serie", ""),
                "folio": doc.get("Folio", ""),
                "moneda": doc.get(
                    "MonedaDR", "MXN"
                ),  # 🚀 AQUÍ OCURRE LA MAGIA. Lee 'MXN' del XML
                "saldo_anterior": doc.get("ImpSaldoAnt"),
                "monto_pagado": doc.get("ImpPagado"),
                "saldo_insoluto": doc.get("ImpSaldoInsoluto"),
                "parcialidad": doc.get("NumParcialidad"),
            }
        )

    datos_pago = {
        "folio": folio.replace("COM-", ""),
        "fecha": comprobante.get("Fecha"),
        "rfc_cliente": receptor.get("Rfc"),
        "nombre_cliente": receptor.get("Nombre", "PUBLICO EN GENERAL"),
        "cp_cliente": receptor.get("DomicilioFiscalReceptor"),
        "regimen_cliente": receptor.get("RegimenFiscalReceptor"),
        "uso_cfdi": receptor.get("UsoCFDI"),
        "fecha_pago": pago_node.get("FechaPago"),
        "forma_pago": pago_node.get("FormaDePagoP"),
        "monto_total": monto_total,
        "doctos_relacionados": doctos_relacionados,
        "cuenta_deposito": "",
        "cuenta_beneficiario": pago_node.get("CtaBeneficiario", ""),
        "banco_beneficiario": (
            "NO IDENTIFICADO"
            if not pago_node.get("CtaBeneficiario")
            else "INSTITUCIÓN BANCARIA"
        ),
        "banco_ordenante": pago_node.get("NomBancoOrdExt", ""),
        "cuenta_ordenante": pago_node.get("CtaOrdenante", ""),
        "subtotal": "0.00",
        "iva": "0.00",
        "retenciones": "0.00",
        "total": monto_total,
        "descripcion_concepto": "COMPLEMENTO DE RECEPCIÓN DE PAGOS",
    }

    # 4. Extraer Sellos y Cadena Original
    tfd_node = root.xpath("//tfd:TimbreFiscalDigital", namespaces=ns)[0]
    s_sat = tfd_node.get("SelloSAT", "0000")
    c_sat = tfd_node.get("NoCertificadoSAT", "0000")
    s_emi = comprobante.get("Sello", "0000")
    fecha_certificacion = tfd_node.get("FechaTimbrado", "")

    cadena_original_tfd = f"||{tfd_node.get('Version', '1.1')}|{uuid_pago}|{fecha_certificacion}|{tfd_node.get('RfcProvCertif')}|{tfd_node.get('SelloCFD')}|{c_sat}||"

    total_float = float(monto_total)
    if HAS_NUM2WORDS:
        entero = int(total_float)
        decimales = int(round((total_float - entero) * 100))
        texto = num2words(entero, lang="es").upper().replace("UNO", "UN")
        importe_letra = f"(*** {texto} PESOS {decimales:02d}/100 MXN ***)"
    else:
        importe_letra = f"(*** {total_float:,.2f} MXN ***)"

    qr_string = f"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id={uuid_pago}&re={emisor.get('Rfc')}&rr={receptor.get('Rfc')}&tt={total_float:.2f}&fe={s_emi[-8:]}"
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(qr_string)
    qr.make(fit=True)
    buffer = BytesIO()
    qr.make_image(fill_color="black", back_color="white").save(buffer, format="PNG")

    # 5. Generar PDF sobrescribiendo el defectuoso
    service._generar_pdf_pago(
        datos_pago,
        uuid_pago,
        buffer.getvalue(),
        s_sat,
        s_emi,
        c_sat,
        cadena_original_tfd,
        importe_letra,
        fecha_certificacion,
    )
    print(
        f"✅ ¡ÉXITO! PDF regenerado. Moneda corregida. Archivo en: {service.storage_dir}/{uuid_pago.upper()}.pdf"
    )


if __name__ == "__main__":
    if len(sys.argv) > 1:
        regenerar_pdf(sys.argv[1])
    else:
        print("Por favor especifica un folio.")
