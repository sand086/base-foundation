import os
import base64
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

# Configurar rutas del proyecto
backend_dir = Path(__file__).resolve().parent
template_dir = backend_dir / "app" / "templates"
pdf_path = (
    backend_dir
    / "app"
    / "storage"
    / "xml_timbrados"
    / "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF.pdf"
)
xml_path = (
    backend_dir
    / "app"
    / "storage"
    / "xml_timbrados"
    / "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF.xml"
)

print("\n" + "=" * 80)
print("🎨 GENERANDO PDF NATIVO CON WEASYPRINT DESDE EL XML DEL SAT")
print("=" * 80)

# 1. Procesar el logotipo en Base64 tal cual lo hace tu sistema original
logo_path = template_dir / "assets" / "logo-black.png"
logo_src = ""
if logo_path.exists():
    with open(logo_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        logo_src = f"data:image/png;base64,{encoded_string}"

# 2. Contexto real extraído directamente de tu XML (con las series CP y F mapeadas)
context = {
    "logo_src": logo_src,
    "remitente_nombre": "RAPIDOS 3T",
    "remitente_rfc": "RTX110624KP5",
    "cp_emisor": "91808",
    "regimen_emisor": "624 - Coordinados",
    "folio_interno": "COM-2638",
    "fecha_emision": "2026-07-14 13:24:05",
    "destinatario_nombre": "HANSA MEYER GLOBAL TRANSPORT",
    "destinatario_rfc": "HMG980427Q42",
    "uso_cfdi": "CP01 - Pagos",
    "cp_cliente": "03710",
    "regimen_cliente": "601 - General de Ley Personas Morales",
    "doctos_relacionados": [
        {
            "serie": "CP",
            "folio": "17665",
            "uuid": "A7CD5A1D-8094-4A8E-88DC-741581917104",
            "parcialidad": "2",
            "saldo_anterior": "85,120.00",
            "monto_pagado": "85,120.00",
            "saldo_insoluto": "0.00",
            "moneda": "MXN",
        },
        {
            "serie": "CP",
            "folio": "17559",
            "uuid": "539129E8-5627-4E1B-B0FC-B34C185CDABF",
            "parcialidad": "2",
            "saldo_anterior": "72,800.00",
            "monto_pagado": "72,800.00",
            "saldo_insoluto": "0.00",
            "moneda": "MXN",
        },
        {
            "serie": "F",
            "folio": "9762",
            "uuid": "78ADE59D-48FF-40A2-84AF-81768B96F1DD",
            "parcialidad": "2",
            "saldo_anterior": "3,074.00",
            "monto_pagado": "3,074.00",
            "saldo_insoluto": "0.00",
            "moneda": "MXN",
        },
        {
            "serie": "CP",
            "folio": "17444",
            "uuid": "BE87BD06-6B0F-4AF3-B2FB-DBB22D530907",
            "parcialidad": "2",
            "saldo_anterior": "45,920.00",
            "monto_pagado": "45,920.00",
            "saldo_insoluto": "0.00",
            "moneda": "MXN",
        },
        {
            "serie": "CP",
            "folio": "17441",
            "uuid": "88ABFFF2-6CAB-4366-B352-055AE3272E37",
            "parcialidad": "2",
            "saldo_anterior": "45,920.00",
            "monto_pagado": "45,920.00",
            "saldo_insoluto": "0.00",
            "moneda": "MXN",
        },
        {
            "serie": "CP",
            "folio": "17424",
            "uuid": "78AAB569-26A0-4E1F-BE5E-D0071621DC78",
            "parcialidad": "2",
            "saldo_anterior": "45,920.00",
            "monto_pagado": "45,920.00",
            "saldo_insoluto": "0.00",
            "moneda": "MXN",
        },
        {
            "serie": "CP",
            "folio": "17388",
            "uuid": "58D2B363-1721-4E5E-8105-B42D56BD5EAA",
            "parcialidad": "1",
            "saldo_anterior": "44,800.00",
            "monto_pagado": "44,800.00",
            "saldo_insoluto": "0.00",
            "moneda": "MXN",
        },
    ],
    "fecha_pago": "2026-06-30 12:00:00",
    "forma_pago": "03 - Transferencia electrónica de fondos",
    "total": "343,554.00",
    "importe_letra": "(***TRESCIENTOS CUARENTA Y TRES MIL QUINIENTOS CINCUENTA Y CUATRO PESOS 00/100 MXN ***)",
    "banco_beneficiario": "BANORTE",
    "cuenta_beneficiario": "1001497363",
    "qr_src": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=4F18F5B4-62C6-4D89-9065-74F9AA22ACBF%26re=RTX110624KP5%26rr=HMG980427Q42%26tt=343554.00%26fe=Fce4MZ1kC0C5FT900X0FUIH951G==",
    "uuid": "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF",
    "cert_sat": "00001000000710052019",
    "fecha_certificacion": "2026-07-14 13:24:06",
    "sello_emisor": "g9S9I8KKRo7oCCejK4aSwtW3TAry66v25fhRYCPpQZQ6Eqrm22M8doCX/m4VWIVFn7Gv0duhEUl/OPND6pqfzaevSzwogPtHqyhfDCtLKUSYCnOGPWdiZ4PyP0WrW5p9+7M/JTpCiBFa3TjpVZvm2YNoXHMJzBecbAzxJvUlMOQC6JuD9nt6/FEeQr89VXU8YaCDefEyMZfiN6jc1fMhvPdIlJSYb4BGnKjNmpiPT4YWbDA9NdJ+2LV6WFq1oW8v2YVpj+Upk0pSGfYNxbgQgY+WdmKSH2biVR+5DNMnfpJMsiHuJsCTZeIY4yv/kfHGKl2IeBqzoeILsc7+IvMCZQ==",
    "sello_sat": "MliDkTtisiO/W5HJgnyhwLKYeXVHbuXFU3q4mmkhtuLAmKx/0/cBn1Hum6gamrRH33RQUO2wIxShcVgzAaQEpNpXACSZm7jnj2uA73Kbpk5wxBOGBlTdo1fKk9OT6Mo03pk2Le9KmohLd1ig7H27RmnvvYYFKkcJHgGYXkPlzBZJSKTntrZn6UfGffukR4d9AWfFtYaYDcXB+MdaMsHVsUgEiMYyEVFYsPIpJ/WPhFoKylevDGdaCqyJOdJHtLP/PkkK5+gQVa5DwPkoVEo7r1yENJ58IvCqoa1D3QbMCYs8khy73RKzMQPbcPuFCe4Mz1kc0C5FT900X0FUIH951G==",
    "cadena_original": "||1.1|4F18F5B4-62C6-4D89-9065-74F9AA22ACBF|2026-07-14T13:24:06|SFE0807172W8|g9S9I8KKRo7oCCejK4aSwtW3TAry66v25fhRYCPpQZQ6Eqrm22M8doCX/m4VWIVFn7Gv0duhEUl/OPND6pqfzaevSzwogPtHqyhfDCtLKUSYCnOGPWdiZ4PyP0WrW5p9+7M/JTpCiBFa3TjpVZvm2YNoXHMJzBecbAzxJvUlMOQC6JuD9nt6/FEeQr89VXU8YaCDefEyMZfiN6jc1fMhvPdIlJSYb4BGnKjNmpiPT4YWbDA9NdJ+2LV6WFq1oW8v2YVpj+Upk0pSGfYNxbgQgY+WdmKSH2biVR+5DNMnfpJMsiHuJsCTZeIY4yv/kfHGKl2IeBqzoeILsc7+IvMCZQ==|00001000000710052019||",
}

# 3. Compilar el HTML usando Jinja2 directamente sobre tu plantilla original
try:
    env = Environment(loader=FileSystemLoader(str(template_dir)))
    template = env.get_template("complemento_pago.html")
    html_rendered = template.render(context)
    print("✅ Jinja2 acopló la información a la plantilla 'complemento_pago.html'.")
except Exception as je:
    print(f"❌ Error al procesar Jinja2: {je}")
    exit(1)

# 4. Usar WeasyPrint (Tu motor oficial de la app) para inyectar el PDF hermoso
try:
    # Eliminar el archivo viejo si existe para evitar conflictos
    if pdf_path.exists():
        os.remove(pdf_path)

    print("⏳ Ejecutando WeasyPrint sobre los estilos CSS... Por favor espera.")
    HTML(string=html_rendered).write_pdf(str(pdf_path))
    print(f"\n🎉 ¡ÉXITO ROTUNDO! PDF sembrado nativamente en: {pdf_path}")
except Exception as we:
    print(f"❌ Error crítico de compilación en WeasyPrint: {we}")

print("=" * 80 + "\n")
