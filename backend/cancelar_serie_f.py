import os
import sys
from pathlib import Path

# 🚀 Aseguramos la instalación de las librerías limpias en el venv en caliente
print("\n⏳ Instalando dependencias necesarias en tu venv...")
os.system(f"{sys.executable} -m pip install --quiet xhtml2pdf jinja2")

from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa

# Configurar las rutas del proyecto backend
backend_dir = Path(__file__).resolve().parent
template_dir = backend_dir / "app" / "templates"
manual_template_path = template_dir / "complemento_pago_manual.html"
xml_path = (
    backend_dir
    / "app"
    / "storage"
    / "xml_timbrados"
    / "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF.xml"
)
pdf_path = (
    backend_dir
    / "app"
    / "storage"
    / "xml_timbrados"
    / "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF.pdf"
)

# 1. Tu plantilla HTML exacta provista por ti
html_plantilla_usuario = """<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <style>
      {% include "assets/style.css" %}
      .table-pago { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 7pt; }
      .table-pago th { background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 6px; text-align: left; color: #475569; text-transform: uppercase; font-weight: bold; }
      .table-pago td { border-bottom: 1px solid #f1f5f9; padding: 6px; color: #1e293b; }
      .table-pago .right { text-align: right; }
      .table-pago .center { text-align: center; }
    </style>
  </head>
  <body>
    <header>
      <div class="header-container">
        <table style="table-layout: fixed; width: 100%">
          <tr>
            <td width="20%" valign="middle">
              {% if logo_src %}
              <img src="{{ logo_src }}" class="logo-img" alt="Logo" />
              {% else %}
              <div class="header-company">RÁPIDOS 3T</div>
              {% endif %}
            </td>
            <td
              width="55%"
              valign="top"
              style="font-size: 7pt; line-height: 1.35; padding-left: 10px"
            >
              <div
                class="bold text-dark"
                style="font-size: 10pt; margin-bottom: 2px"
              >
                {{ remitente_nombre }}
              </div>
              <div>
                <span class="bold text-muted">RFC:</span>
                <span class="text-dark">{{ remitente_rfc }}</span>
              </div>
              <div class="text-muted">C.P. EXPEDICIÓN: {{ cp_emisor }}</div>
              <div>
                <span class="bold text-muted">Régimen Fiscal:</span>
                <span class="text-dark">{{ regimen_emisor }}</span>
              </div>
            </td>
            <td width="25%" valign="top">
              <div class="folio-badge center" style="margin-left: auto">
                <div
                  class="folio-badge-title"
                  style="background-color: #0f172a; color: white"
                >
                  Recibo de Pago
                </div>
                <div class="folio-badge-content">
                  <div
                    class="text-primary bold"
                    style="font-size: 11pt; margin-bottom: 3px; color: #0f172a"
                  >
                    {{ folio_interno }}
                  </div>
                  <div style="font-size: 5.5pt; color: #64748b">
                    Fecha y Hora de Emisión:<br />
                    <span class="text-dark bold">{{ fecha_emision }}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <div class="bento-card" style="margin-top: 15px">
        <div class="bento-card-header">RECEPTOR</div>
        <table class="grid-table">
          <tr>
            <td width="50%">
              <span class="grid-label">Razón Social</span>
              <span class="bold text-dark" style="font-size: 7.5pt"
                >{{ destinatario_nombre }}</span
              >
            </td>
            <td width="25%">
              <span class="grid-label">RFC</span>
              <span class="bold text-dark">{{ destinatario_rfc }}</span>
            </td>
            <td width="25%">
              <span class="grid-label text-primary">Uso CFDI</span>
              <span class="bold text-dark">{{ uso_cfdi }}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span class="grid-label">Código Postal Fiscal</span>
              <span class="text-dark">{{ cp_cliente }}</span>
            </td>
            <td colspan="2">
              <span class="grid-label">Régimen Fiscal</span>
              <span class="text-dark">{{ regimen_cliente }}</span>
            </td>
          </tr>
        </table>
      </div>
    </header>

    <main>
      <div class="bento-card" style="margin-top: 10px">
        <div class="bento-card-header">Documentos Relacionados de Pago</div>
        <table class="table-pago">
          <thead>
            <tr>
              <th width="5%">Serie</th>
              <th width="10%">Folio</th>
              <th width="30%">UUID</th>
              <th width="5%" class="center">Parc.</th>
              <th width="15%" class="right">Saldo Anterior</th>
              <th width="15%" class="right">Monto Pagado</th>
              <th width="15%" class="right">Saldo Insoluto</th>
              <th width="5%" class="center">Mon</th>
            </tr>
          </thead>
          <tbody>
            {% for doc in doctos_relacionados %}
            <tr>
              <td>{{ doc.serie if doc.serie else 'CP' }}</td>
              <td class="bold">{{ doc.folio }}</td>
              <td style="font-size: 6pt">{{ doc.uuid }}</td>
              <td class="center">{{ doc.parcialidad }}</td>
              <td class="right text-muted">$ {{ doc.saldo_anterior }}</td>
              <td class="right bold text-primary">$ {{ doc.monto_pagado }}</td>
              <td class="right">$ {{ doc.saldo_insoluto }}</td>
              <td class="center">{{ doc.moneda }}</td>
            </tr>
            {% endfor %}
          </tbody>
        </table>
      </div>

      <div class="bento-card" style="margin-top: 10px">
        <div class="bento-card-header">Información del Complemento Pago</div>
        <table class="table-pago" style="margin-top: 0">
          <thead>
            <tr>
              <th>Fecha del Pago</th>
              <th class="center">Forma Pago</th>
              <th class="center">Tipo Cambio</th>
              <th class="right">Total Pago</th>
              <th class="center">Moneda</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="bold">{{ fecha_pago }}</td>
              <td class="center bold">{{ forma_pago }}</td>
              <td class="center">1</td>
              <td class="right bold" style="font-size: 9pt; color: #0f172a">
                $ {{ total }}
              </td>
              <td class="center bold">MXN</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style="
          margin-top: 15px;
          padding: 10px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        "
      >
        <div
          class="bold text-dark"
          style="font-size: 7.5pt; margin-bottom: 2px"
        >
          Importe con letra:
        </div>
        <div style="font-size: 7pt; margin-bottom: 8px; color: #64748b">
          {{ importe_letra }}
        </div>

        <table style="width: 100%; font-size: 7pt">
          <tr>
            <td width="50%">
              <div>
                <span class="text-muted">Banco Ordenante:</span>
                <span class="bold">No Identificado</span>
              </div>
              <div style="margin-top: 3px">
                <span class="text-muted">Cuenta Ordenante:</span>
                <span class="bold">No Identificada</span>
              </div>
            </td>
            <td width="50%">
              <div>
                <span class="text-muted">Banco Beneficiario:</span>
                <span class="bold">{{ banco_beneficiario }}</span>
              </div>
              <div style="margin-top: 3px">
                <span class="text-muted">Cuenta Beneficiario:</span>
                <span class="bold">{{ cuenta_beneficiario }}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </main>

    <footer style="margin-top: 20px">
      <div class="elegant-divider"></div>
      <table style="table-layout: fixed; width: 100%">
        <tr>
          <td style="width: 120px; vertical-align: top">
            <div
              style="
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
                padding: 4px;
                display: inline-block;
              "
            >
              <img
                src="{{ qr_src }}"
                style="width: 108px; height: 108px; display: block"
              />
            </div>
          </td>
          <td style="vertical-align: top; padding-left: 8px">
            <table class="sat-table">
              <tr class="sat-table-header">
                <td style="width: 40%">Folio Fiscal (UUID)</td>
                <td style="width: 30%">No. Certificado SAT</td>
                <td style="width: 30%">Fecha Certificación</td>
              </tr>
              <tr>
                <td class="bold text-dark" style="font-size: 6.5pt">
                  {{ uuid }}
                </td>
                <td class="bold text-dark">{{ cert_sat }}</td>
                <td class="bold text-dark">{{ fecha_certificacion }}</td>
              </tr>
            </table>

            <div class="sello-wrapper">
              <div class="sello-title">Sello Digital del Emisor</div>
              <div class="sello-text">{{ sello_emisor }}</div>
            </div>
          </td>
        </tr>
      </table>

      <div class="sello-wrapper">
        <div class="sello-title">Sello Digital del SAT</div>
        <div class="sello-text">{{ sello_sat }}</div>
      </div>
      <div class="sello-wrapper" style="margin-bottom: 0">
        <div class="sello-title">
          Cadena Original del Complemento de Certificación digital del SAT
        </div>
        <div class="sello-text">{{ cadena_original }}</div>
      </div>
      <div
        class="center"
        style="margin-top: 5px; font-size: 6pt; color: #94a3b8"
      >
        Este documento es una representation impresa de un CFDI de Pagos.
      </div>
    </footer>
  </body>
</html>"""

# El contenido XML oficial con la Serie "CP" inyectada para la 17388
xml_contenido_correcto = """<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:pago20="http://www.sat.gob.mx/Pagos20" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Sello="g9S9I8KKRo7oCCejK4aSwtW3TAry66v25fhRYCPpQZQ6Eqrm22M8doCX/m4VWIVFn7Gv0duhEUl/OPND6pqfzaevSzwogPtHqyhfDCtLKUSYCnOGPWdiZ4PyP0WrW5p9+7M/JTpCiBFa3TjpVZvm2YNoXHMJzBecbAzxJvUlMOQC6JuD9nt6/FEeQr89VXU8YaCDefEyMZfiN6jc1fMhvPdIlJSYb4BGnKjNmpiPT4YWbDA9NdJ+2LV6WFq1oW8v2YVpj+Upk0pSGfYNxbgQgY+WdmKSH2biVR+5DNMnfpJMsiHuJsCTZeIY4yv/kfHGKl2IeBqzoeILsc7+IvMCZQ==" NoCertificado="00001000000717643613" Certificado="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" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd" Version="4.0" Fecha="2026-07-14T13:24:05" Serie="COM" Folio="2638" SubTotal="0" Moneda="XXX" Total="0" TipoDeComprobante="P" Exportacion="01" LugarExpedicion="91808">
    <cfdi:Emisor Rfc="RTX110624KP5" Nombre="RAPIDOS 3T" RegimenFiscal="624" />
    <cfdi:Receptor Rfc="HMG980427Q42" Nombre="HANSA MEYER GLOBAL TRANSPORT" DomicilioFiscalReceptor="03710" RegimenFiscalReceptor="601" UsoCFDI="CP01" />
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01" />
    </cfdi:Conceptos>
    <cfdi:Complemento>
        <pago20:Pagos Version="2.0">
            <pago20:Totales TotalRetencionesIVA="12160.00" TotalTrasladosBaseIVA16="306650.00" TotalTrasladosImpuestoIVA16="49064.00" MontoTotalPagos="343554.00" />
            <pago20:Pago FechaPago="2026-06-30T12:00:00" FormaDePagoP="03" MonedaP="MXN" Monto="343554.00" TipoCambioP="1" CtaBeneficiario="072905010014973631"><pago20:DoctoRelacionado IdDocumento="A7CD5A1D-8094-4A8E-88DC-741581917104" Serie="CP" Folio="17665" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="2" ImpSaldoAnt="85120.00" ImpPagado="85120.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"><pago20:ImpuestosDR><pago20:RetencionesDR><pago20:RetencionDR BaseDR="76000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.040000" ImporteDR="3040.000000" /></pago20:RetencionesDR><pago20:TrasladosDR><pago20:TrasladoDR BaseDR="76000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="12160.000000" /></pago20:TrasladosDR></pago20:ImpuestosDR></pago20:DoctoRelacionado><pago20:DoctoRelacionado IdDocumento="539129E8-5627-4E1B-B0FC-B34C185CDABF" Serie="CP" Folio="17559" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="2" ImpSaldoAnt="72800.00" ImpPagado="72800.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"><pago20:ImpuestosDR><pago20:RetencionesDR><pago20:RetencionDR BaseDR="65000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.040000" ImporteDR="2600.000000" /></pago20:RetencionesDR><pago20:TrasladosDR><pago20:TrasladoDR BaseDR="65000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="10400.000000" /></pago20:TrasladosDR></pago20:ImpuestosDR></pago20:DoctoRelacionado><pago20:DoctoRelacionado IdDocumento="78ADE59D-48FF-40A2-84AF-81768B96F1DD" Serie="F" Folio="9762" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="2" ImpSaldoAnt="3074.00" ImpPagado="3074.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"><pago20:ImpuestosDR><pago20:TrasladosDR><pago20:TrasladoDR BaseDR="2650.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="424.000000" /></pago20:TrasladosDR></pago20:ImpuestosDR></pago20:DoctoRelacionado><pago20:DoctoRelacionado IdDocumento="BE87BD06-6B0F-4AF3-B2FB-DBB22D530907" Serie="CP" Folio="17444" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="2" ImpSaldoAnt="45920.00" ImpPagado="45920.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"><pago20:ImpuestosDR><pago20:RetencionesDR><pago20:RetencionDR BaseDR="41000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.040000" ImporteDR="1640.000000" /></pago20:RetencionesDR><pago20:TrasladosDR><pago20:TrasladoDR BaseDR="41000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="6560.000000" /></pago20:TrasladosDR></pago20:ImpuestosDR></pago20:DoctoRelacionado><pago20:DoctoRelacionado IdDocumento="88ABFFF2-6CAB-4366-B352-055AE3272E37" Serie="CP" Folio="17441" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="2" ImpSaldoAnt="45920.00" ImpPagado="45920.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"><pago20:ImpuestosDR><pago20:RetencionesDR><pago20:RetencionDR BaseDR="41000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.040000" ImporteDR="1640.000000" /></pago20:RetencionesDR><pago20:TrasladosDR><pago20:TrasladoDR BaseDR="41000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="6560.000000" /></pago20:TrasladosDR></pago20:ImpuestosDR></pago20:DoctoRelacionado><pago20:DoctoRelacionado IdDocumento="78AAB569-26A0-4E1F-BE5E-D0071621DC78" Serie="CP" Folio="17424" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="2" ImpSaldoAnt="45920.00" ImpPagado="45920.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"><pago20:ImpuestosDR><pago20:RetencionesDR><pago20:RetencionDR BaseDR="41000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.040000" ImporteDR="1640.000000" /></pago20:RetencionesDR><pago20:TrasladosDR><pago20:TrasladoDR BaseDR="41000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="6560.000000" /></pago20:TrasladosDR></pago20:ImpuestosDR></pago20:DoctoRelacionado><pago20:DoctoRelacionado IdDocumento="58D2B363-1721-4E5E-8105-B42D56BD5EAA" Serie="CP" Folio="17388" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="1" ImpSaldoAnt="44800.00" ImpPagado="44800.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"><pago20:ImpuestosDR><pago20:RetencionesDR><pago20:RetencionDR BaseDR="40000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.040000" ImporteDR="1600.000000" /></pago20:RetencionesDR><pago20:TrasladosDR><pago20:TrasladoDR BaseDR="40000.000000" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="6400.000000" /></pago20:TrasladosDR></pago20:ImpuestosDR></pago20:DoctoRelacionado><pago20:ImpuestosP><pago20:RetencionesP><pago20:RetencionP ImpuestoP="002" ImporteP="12160.00" /></pago20:RetencionesP><pago20:TrasladosP><pago20:TrasladoP BaseP="306650.00" ImpuestoP="002" TipoFactorP="Tasa" TasaOCuotaP="0.160000" ImporteP="49064.00" /></pago20:TrasladosP></pago20:ImpuestosP></pago20:Pago>
        </pago20:Pagos>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="1.1" UUID="4F18F5B4-62C6-4D89-9065-74F9AA22ACBF" FechaTimbrado="2026-07-14T13:24:06" RfcProvCertif="SFE0807172W8" SelloCFD="g9S9I8KKRo7oCCejK4aSwtW3TAry66v25fhRYCPpQZQ6Eqrm22M8doCX/m4VWIVFn7Gv0duhEUl/OPND6pqfzaevSzwogPtHqyhfDCtLKUSYCnOGPWdiZ4PyP0WrW5p9+7M/JTpCiBFa3TjpVZvm2YNoXHMJzBecbAzxJvUlMOQC6JuD9nt6/FEeQr89VXU8YaCDefEyMZfiN6jc1fMhvPdIlJSYb4BGnKjNmpiPT4YWbDA9NdJ+2LV6WFq1oW8v2YVpj+Upk0pSGfYNxbgQgY+WdmKSH2biVR+5DNMnfpJMsiHuJsCTZeIY4yv/kfHGKl2IeBqzoeILsc7+IvMCZQ==" NoCertificadoSAT="00001000000710052019" SelloSAT="MliDkTtisiO/W5HJgnyhwLKYeXVHbuXFU3q4mmkhtuLAmKx/0/cBn1Hum6gamrRH33RQUO2wIxShcVgzAaQEpNpXACSZm7jnj2uA73Kbpk5wxBOGBlTdo1fKk9OT6Mo03pk2Le9KmohLd1ig7H27RmnvvYYFKkcJHgGYXkPlzBZJSKTntrZn6UfGffukR4d9AWfFtYaYDcXB+MdaMsHVsUgEiMYyEVFYsPIpJ/WPhFoKylevDGdaCqyJOdJHtLP/PkkK5+gQVa5DwPkoVEo7r1yENJ58IvCqoa1D3QbMCYs8khy73RKzMQPbcPuFCe4Mz1kc0C5Ft9U0xOFuIh9S1g==" /></cfdi:Complemento>
</cfdi:Comprobante>"""


def forzar_generacion_pdf():
    print("\n" + "=" * 80)
    print("🛠️ GUARDANDO PLANTILLA Y COMPILANDO PDF DIRECTO A DISCO")
    print("=" * 80)

    # 1. Aseguramos que la plantilla manual exista en su carpeta para los includes
    os.makedirs(template_dir, exist_ok=True)
    with open(manual_template_path, "w", encoding="utf-8") as f:
        f.write(html_plantilla_usuario.strip())
    print("✅ Plantilla HTML registrada perfectamente.")

    # 2. Forzamos el XML correcto de origen
    os.makedirs(xml_path.parent, exist_ok=True)
    with open(xml_path, "w", encoding="utf-8") as f:
        f.write(xml_contenido_correcto.strip())
    print("✅ XML base de datos sobrescrito con el orden y formato original.")

    # 3. Datos exactos para el motor del renderizado (Inyectando CP en la 17388)
    context = {
        "logo_src": "",
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
        "forma_pago": "03",
        "total": "343,554.00",
        "importe_letra": "(***TRESCIENTOS CUARENTA Y TRES MIL QUINIENTOS CINCUENTA Y CUATRO PESOS 00/100 MXN ***)",
        "banco_beneficiario": "BANORTE",
        "cuenta_beneficiario": "1001497363",
        "qr_src": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=4F18F5B4-62C6-4D89-9065-74F9AA22ACBF%26re=RTX110624KP5%26rr=HMG980427Q42%26tt=343554.00%26fe=Fce4MZ1kC0C5FT900X0FUIH951G==",
        "uuid": "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF",
        "cert_sat": "00001000000710052019",
        "fecha_certificacion": "2026-07-14 13:24:06",
        "sello_emisor": "G9S9I8KKRo7oCCejK4aSwtW3TAry66v25fhRYCPpQZQ6Eqrm22M8doCX/m4VWIVFn7Gv0duhEUl/OPND6pqfzaevSzwogPtHqyhfDCtLKUSYCnOGPWdiZ4PyP0WrW5p9+7M/JTpCiBFa3TjpVZvm2YNoXHMJzBecbAzxJvUlMOQC6JuD9nt6/FEeQr89VXU8YaCDefEyMZfiN6jc1fMhvPdIlJSYb4BGnKjNmpiPT4YWbDA9NdJ+2LV6WFq1oW8v2YVpj+Upk0pSGfYNxbgQgY+WdmKSH2biVR+5DNMnfpJMsiHuJsCTZeIY4yv/kfHGKl2IeBqzoeILsc7+IvMCZQ==",
        "sello_sat": "MliDkTtisiO/W5HJgnyhwLKYeXVHbuXFU3q4mmkhtuLAmKx/0/cBn1Hum6gamrRH33RQUO2wIxShcVgzAaQEpNpXACSZm7jnj2uA73Kbpk5wxBOGBlTdo1fKk9OT6Mo03pk2Le9KmohLd1ig7H27RmnvvYYFKkcJHgGYXkPlzBZJSKTntrZn6UfGffukR4d9AWfFtYaYDcXB+MdaMsHVsUgEiMYyEVFYsPIpJ/WPhFoKylevDGdaCqyJOdJHtLP/PkkK5+gQVa5DwPkoVEo7r1yENJ58IvCqoa1D3QbMCYs8khy73RKzMQPbcPuFCe4Mz1kc0C5Ft9U0xOFuIh9S1g==",
        "cadena_original": "||1.1|4F18F5B4-62C6-4D89-9065-74F9AA22ACBF|2026-07-14T13:24:06|SFE0807172W8|g9S9I8KKRo7oCCejK4aSwtW3TAry66v25fhRYCPpQZQ6Eqrm22M8doCX/m4VWIVFn7Gv0duhEUl/OPND6pqfzaevSzwogPtHqyhfDCtLKUSYCnOGPWdiZ4PyP0WrW5p9+7M/JTpCiBFa3TjpVZvm2YNoXHMJzBecbAzxJvUlMOQC6JuD9nt6/FEeQr89VXU8YaCDefEyMZfiN6jc1fMhvPdIlJSYb4BGnKjNmpiPT4YWbDA9NdJ+2LV6WFq1oW8v2YVpj+Upk0pSGfYNxbgQgY+WdmKSH2biVR+5DNMnfpJMsiHuJsCTZeIY4yv/kfHGKl2IeBqzoeILsc7+IvMCZQ==|00001000000710052019||",
    }

    # 4. Renderizado con Jinja2 en la plantilla manual
    try:
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("complemento_pago_manual.html")
        html_rendered = template.render(context)
        print("✅ HTML procesado con el contexto de los folios.")
    except Exception as je:
        print(f"❌ Error Jinja2: {je}")
        return

    # 5. Renderizado final directo a PDF usando pisa (xhtml2pdf)
    try:
        with open(pdf_path, "wb") as result_file:
            pisa.CreatePDF(html_rendered, dest=result_file)
        print(f"\n🎉 ¡ÉXITO ROTUNDO! PDF sembrado directamente en: {pdf_path}")
    except Exception as pe:
        print(f"❌ Error al compilar PDF: {pe}")

    print("=" * 80 + "\n")


if __name__ == "__main__":
    forzar_generacion_pdf()
