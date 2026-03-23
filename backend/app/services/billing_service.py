import os

import base64
import logging
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from io import BytesIO


import zeep
from zeep.plugins import HistoryPlugin
from lxml import etree
from fastapi import HTTPException
from sqlalchemy.orm import Session
import qrcode

# Librerías para criptografía
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_der_private_key

from app.models.models import (
    Trip,
    TripLeg,
    ReceivableInvoice,
    Client as ClientModel,
    Unit,
    Operator,
)
from app.schemas.trips import ReceivableInvoiceCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("billing.audit")


class BillingService:
    def __init__(self, db: Session):
        self.db = db
        self.wsdl_timbrado = (
            "https://testing.solucionfactible.com/ws/services/Timbrado?wsdl"
        )
        self.pac_user = "testing@solucionfactible.com"
        self.pac_pass = "timbrado.SF.16672"
        self.history = HistoryPlugin()

        self.base_path = Path(
            os.getenv("APP_BASE_PATH", Path(__file__).resolve().parents[1])
        )
        self.cert_dir = Path(os.getenv("CERT_DIR", self.base_path / "certs"))
        self.storage_dir = Path(
            os.getenv("STORAGE_DIR", self.base_path / "storage" / "xml_timbrados")
        )
        self.templates_dir = Path(
            os.getenv("TEMPLATES_DIR", self.base_path / "templates")
        )

        self.storage_dir.mkdir(parents=True, exist_ok=True)

        self.path_cer = (
            self.cert_dir / "CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer"
        )
        self.path_key = (
            self.cert_dir / "CSD_Sucursal_1_EKU9003173C9_20230517_223850.key"
        )
        self.key_password = "12345678a"

    def generar_carta_porte_nominal(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador = self._obtener_datos_completos(
            invoice_data.viaje_id
        )
        resultado_pac = self._importar_comprobante_ws(viaje, cliente, unidad, operador)

        monto_total = Decimal("1.12")
        nueva_factura = ReceivableInvoice(
            client_id=viaje.client_id,
            viaje_id=viaje.id,
            uuid=getattr(resultado_pac, "uuid", None),
            is_nominal=True,
            status_sat="TIMBRADA",
            estatus="pendiente",
            concepto=f"Carta Porte nominal viaje {viaje.id}",
            monto_total=monto_total,
            saldo_pendiente=monto_total,
            subtotal=Decimal("1.00"),
            iva=Decimal("0.16"),
            retenciones=Decimal("0.04"),
            moneda="MXN",
            fecha_emision=date.today(),
            fecha_vencimiento=date.today(),
        )
        try:
            self.db.add(nueva_factura)
            self.db.commit()
            self.db.refresh(nueva_factura)
            logger.info(f"✅ Factura persistida exitosamente: {nueva_factura.uuid}")
            return nueva_factura
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail="Error en BD local al guardar factura."
            )

    def _importar_comprobante_ws(self, viaje, cliente, unidad, operador):
        try:
            client = zeep.Client(self.wsdl_timbrado, plugins=[self.history])
            fecha_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

            data = {
                "folio": str(viaje.id),
                "fecha": fecha_iso,
                "rfc_cliente": getattr(cliente, "rfc", "CSJ871008UQ4"),
                "nombre_cliente": getattr(cliente, "razon_social", "CREMERIA SAN JOSE"),
                "cp_cliente": getattr(cliente, "codigo_postal", "09040"),
                "regimen_cliente": str(
                    getattr(cliente, "regimen_fiscal", "601") or "601"
                ),
                "uso_cfdi": "G03",
                "placas": getattr(unidad, "placas", "89BH4C"),
                "anio_modelo": str(getattr(unidad, "anio", "2026")),
                "config_vehicular": getattr(unidad, "configuracion", "T3S3"),
                "peso_bruto_vehicular": "25.00",
                "permiso_sct": str(getattr(unidad, "permiso_sct", "TPAF01"))
                .split(" ")[0]
                .strip(),
                "num_permiso": getattr(
                    unidad, "num_permiso", "3066RTX02122011230301021"
                ),
                "aseguradora": getattr(unidad, "aseguradora", "QUALITAS"),
                "poliza": getattr(unidad, "poliza", "7050094731"),
                "subtipo_remolque": "CTR010",
                "placa_remolque": "58UD5Z",
                "rfc_operador": (
                    getattr(operador, "rfc", "XAXX010101000")
                    if operador
                    else "XAXX010101000"
                ),
                "nombre_operador": (
                    getattr(operador, "nombre", "MARIO LUIS HERNANDEZ")
                    if operador
                    else "MARIO LUIS HERNANDEZ"
                ),
                "licencia": (
                    getattr(operador, "licencia", "VER119148")
                    if operador
                    else "VER119148"
                ),
            }

            xml_base = self._armar_xml_sin_sello(data)
            xml_sellado = self._sellar_xml(xml_base, data)

            logger.info(f"== [REQUEST] Folio {viaje.id} enviando a timbrado ==")
            result = client.service.timbrar(
                self.pac_user, self.pac_pass, xml_sellado.encode("utf-8"), False
            )

            if int(getattr(result, "status", 0)) != 200:
                raise HTTPException(
                    status_code=400, detail=f"PAC Error: {result.mensaje}"
                )

            res_sat = result.resultados[0]
            if int(getattr(res_sat, "status", 0)) == 200:
                raw_cfdi = res_sat.cfdiTimbrado
                if isinstance(raw_cfdi, str):
                    cfdi_bytes = (
                        raw_cfdi.encode("utf-8")
                        if "<cfdi:Comprobante" in raw_cfdi
                        else base64.b64decode(raw_cfdi)
                    )
                else:
                    cfdi_bytes = raw_cfdi

                raw_qr = res_sat.qrCode
                qr_bytes = (
                    base64.b64decode(raw_qr) if isinstance(raw_qr, str) else raw_qr
                )

                self._guardar_xml_disco(cfdi_bytes, res_sat.uuid)

                root = etree.fromstring(cfdi_bytes)
                ns = {
                    "cfdi": "http://www.sat.gob.mx/cfd/4",
                    "tfd": "http://www.sat.gob.mx/TimbreFiscalDigital",
                }

                s_sat = root.xpath(
                    "//tfd:TimbreFiscalDigital/@SelloSAT", namespaces=ns
                )[0]
                s_emi = root.xpath("//cfdi:Comprobante/@Sello", namespaces=ns)[0]
                c_sat = root.xpath(
                    "//tfd:TimbreFiscalDigital/@NoCertificadoSAT", namespaces=ns
                )[0]

                self._generar_pdf_con_diseno(
                    viaje, res_sat.uuid, qr_bytes, s_sat, s_emi, c_sat, data
                )
                return res_sat
            else:
                logger.error(f"❌ SAT Error: {res_sat.mensaje}")
                raise HTTPException(
                    status_code=400, detail=f"SAT Error 302: {res_sat.mensaje}"
                )

        except Exception as e:
            logger.exception("Error crítico en timbrado")
            raise HTTPException(status_code=500, detail=str(e))

    def _sellar_xml(self, xml_str, data):
        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data)
            cert_b64 = base64.b64encode(cer_data).decode("utf-8").replace("\n", "")
            sn_hex = format(cert.serial_number, "x")
            no_certificado = "".join([sn_hex[i] for i in range(1, len(sn_hex), 2)])

        cadena = (
            f"||4.0|A|{data['folio']}|{data['fecha']}|03|{no_certificado}|CONTADO|1.00|MXN|1.12|I|01|PUE|91808|"
            f"EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|622|"
            f"{data['rfc_cliente']}|{data['nombre_cliente']}|{data['cp_cliente']}|{data['regimen_cliente']}|{data['uso_cfdi']}|"
            f"78101802|SERV001|1.00|E48|SERVICIO|SERVICIO DE FLETE GENERAL|1.00|1.00|02|"
            f"1.00|002|Tasa|0.160000|0.16|"
            f"1.00|002|Tasa|0.040000|0.04|"
            f"002|0.04|0.04|"
            f"1.00|002|Tasa|0.160000|0.16|0.16|"
            f"3.1|CCCe3b8d-a5c4-d91d-2b7a-8951836e3433|No|480|"
            f"Origen|OR000001|EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|{data['fecha']}|17|193|VER|MEX|91808|"
            f"Destino|DE000001|{data['rfc_cliente']}|{data['nombre_cliente']}|{data['fecha']}|480|007|CMX|MEX|{data['cp_cliente']}|"
            f"25000.0|KGM|1|50131801|CARGA GENERAL|1.00|H87|25000.0|"
            f"{data['permiso_sct']}|{data['num_permiso']}|{data['config_vehicular']}|{data['peso_bruto_vehicular']}|{data['placas']}|{data['anio_modelo']}|"
            f"{data['aseguradora']}|{data['poliza']}|"
            f"{data['subtipo_remolque']}|{data['placa_remolque']}|"
            f"01|{data['rfc_operador']}|{data['licencia']}|{data['nombre_operador']}||"
        )

        with open(self.path_key, "rb") as f:
            private_key = load_der_private_key(
                f.read(), password=self.key_password.encode()
            )

        signature = private_key.sign(
            cadena.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256()
        )
        sello_b64 = base64.b64encode(signature).decode("utf-8")

        return xml_str.replace(
            "<cfdi:Comprobante",
            f'<cfdi:Comprobante Sello="{sello_b64}" NoCertificado="{no_certificado}" Certificado="{cert_b64}"',
        )

    def _armar_xml_sin_sello(self, data) -> str:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/CartaPorte31 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd" Version="4.0" Fecha="{data['fecha']}" Serie="A" Folio="{data['folio']}" FormaPago="03" CondicionesDePago="CONTADO" SubTotal="1.00" Moneda="MXN" Total="1.12" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" LugarExpedicion="91808">
    <cfdi:Emisor Rfc="EKU9003173C9" Nombre="ESCUELA KEMPER URGATE SA DE CV" RegimenFiscal="622" />
    <cfdi:Receptor Rfc="{data['rfc_cliente']}" Nombre="{data['nombre_cliente']}" DomicilioFiscalReceptor="{data['cp_cliente']}" RegimenFiscalReceptor="{data['regimen_cliente']}" UsoCFDI="{data['uso_cfdi']}" />
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="78101802" NoIdentificacion="SERV001" Cantidad="1.00" ClaveUnidad="E48" Unidad="SERVICIO" Descripcion="SERVICIO DE FLETE GENERAL" ValorUnitario="1.00" Importe="1.00" ObjetoImp="02">
            <cfdi:Impuestos>
                <cfdi:Traslados><cfdi:Traslado Base="1.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="0.16" /></cfdi:Traslados>
                <cfdi:Retenciones><cfdi:Retencion Base="1.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.040000" Importe="0.04" /></cfdi:Retenciones>
            </cfdi:Impuestos>
        </cfdi:Concepto>
    </cfdi:Conceptos>
    <cfdi:Impuestos TotalImpuestosRetenidos="0.04" TotalImpuestosTrasladados="0.16">
        <cfdi:Retenciones><cfdi:Retencion Impuesto="002" Importe="0.04" /></cfdi:Retenciones>
        <cfdi:Traslados><cfdi:Traslado Base="1.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="0.16" /></cfdi:Traslados>
    </cfdi:Impuestos>
    <cfdi:Complemento>
        <cartaporte31:CartaPorte Version="3.1" IdCCP="CCCe3b8d-a5c4-d91d-2b7a-8951836e3433" TranspInternac="No" TotalDistRec="480">
            <cartaporte31:Ubicaciones>
                <cartaporte31:Ubicacion TipoUbicacion="Origen" IDUbicacion="OR000001" RFCRemitenteDestinatario="EKU9003173C9" NombreRemitenteDestinatario="ESCUELA KEMPER URGATE SA DE CV" FechaHoraSalidaLlegada="{data['fecha']}">
                    <cartaporte31:Domicilio Localidad="17" Municipio="193" Estado="VER" Pais="MEX" CodigoPostal="91808" />
                </cartaporte31:Ubicacion>
                <cartaporte31:Ubicacion TipoUbicacion="Destino" IDUbicacion="DE000001" RFCRemitenteDestinatario="{data['rfc_cliente']}" NombreRemitenteDestinatario="{data['nombre_cliente']}" FechaHoraSalidaLlegada="{data['fecha']}" DistanciaRecorrida="480">
                    <cartaporte31:Domicilio Municipio="007" Estado="CMX" Pais="MEX" CodigoPostal="{data['cp_cliente']}" />
                </cartaporte31:Ubicacion>
            </cartaporte31:Ubicaciones>
            <cartaporte31:Mercancias PesoBrutoTotal="25000.0" UnidadPeso="KGM" NumTotalMercancias="1">
                <cartaporte31:Mercancia BienesTransp="50131801" Descripcion="CARGA GENERAL" Cantidad="1.00" ClaveUnidad="H87" PesoEnKg="25000.0" />
                <cartaporte31:Autotransporte PermSCT="{data['permiso_sct']}" NumPermisoSCT="{data['num_permiso']}">
                    <cartaporte31:IdentificacionVehicular ConfigVehicular="{data['config_vehicular']}" PesoBrutoVehicular="{data['peso_bruto_vehicular']}" PlacaVM="{data['placas']}" AnioModeloVM="{data['anio_modelo']}" />
                    <cartaporte31:Seguros AseguraRespCivil="{data['aseguradora']}" PolizaRespCivil="{data['poliza']}" />
                    <cartaporte31:Remolques><cartaporte31:Remolque SubTipoRem="{data['subtipo_remolque']}" Placa="{data['placa_remolque']}" /></cartaporte31:Remolques>
                </cartaporte31:Autotransporte>
            </cartaporte31:Mercancias>
            <cartaporte31:FiguraTransporte>
                <cartaporte31:TiposFigura TipoFigura="01" RFCFigura="{data['rfc_operador']}" NumLicencia="{data['licencia']}" NombreFigura="{data['nombre_operador']}" />
            </cartaporte31:FiguraTransporte>
        </cartaporte31:CartaPorte>
    </cfdi:Complemento>
</cfdi:Comprobante>""".strip()

    def _generar_pdf_con_diseno(self, viaje, uuid, qr_bytes, s_sat, s_emi, c_sat, data):
        from jinja2 import Environment, FileSystemLoader
        from xhtml2pdf import pisa

        logo_path = self.templates_dir / "assets" / "logo-black.png"
        logo_src = ""
        if logo_path.exists():
            with open(logo_path, "rb") as img:
                logo_src = f"data:image/png;base64,{base64.b64encode(img.read()).decode('utf-8')}"

        qr_sat_b64 = base64.b64encode(qr_bytes).decode("utf-8")
        qr_src = f"data:image/png;base64,{qr_sat_b64}"

        id_ccp = "CCCe3b8d-a5c4-d91d-2b7a-8951836e3433"
        url_ccp = f"https://verificacfdi.facturaelectronica.sat.gob.mx/verificaccp/default.aspx?IdCCP={id_ccp}&Fecha={data['fecha']}"
        img_qr_ccp = qrcode.make(url_ccp)
        buffered = BytesIO()
        img_qr_ccp.save(buffered, format="PNG")
        qr_ccp_src = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"

        env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        template = env.get_template("carta_porte.html")

        # --- UTILIDAD PARA CORTAR CADENAS LARGAS PARA xhtml2pdf ---
        # Esto inserta un salto de línea HTML (<br/>) cada N caracteres
        def split_string(text, length=100):
            if not text:
                return ""
            return "<br/>".join(
                [text[i : i + length] for i in range(0, len(text), length)]
            )

        # Aquí reconstruimos la cadena original para pasarla al contexto
        cadena_original_str = f"||1.1|{uuid}|{data['fecha']}|{s_sat}||"

        context = {
            "uuid": uuid,
            "folio_interno": data["folio"],
            "fecha_emision": data["fecha"],
            "logo_src": logo_src,
            "qr_src": qr_src,
            "qr_ccp_src": qr_ccp_src,
            "id_ccp": id_ccp,
            "nombre_cliente": data["nombre_cliente"],
            "rfc_cliente": data["rfc_cliente"],
            "cp_cliente": data["cp_cliente"],
            "regimen_cliente": data["regimen_cliente"],
            "uso_cfdi": data["uso_cfdi"],
            "cert_sat": c_sat,
            # PASAMOS LOS SELLOS YA PRE-CORTADOS CON LA FUNCIÓN (cortamos cada 110 caracteres)
            "sello_sat": split_string(s_sat, 110),
            "sello_emisor": split_string(s_emi, 110),
            "cadena_original": split_string(cadena_original_str, 110),
            "subtotal": "1.00",
            "iva": "0.16",
            "retenciones": "0.04",
            "total": "1.12",
            "conceptos": [
                {
                    "clave": "78101802",
                    "cantidad": "1.00",
                    "unidad": "E48 - SRV",
                    "descripcion": "[78101802] FLETE CARGA GENERAL CGMU5751959",
                    "precio_unitario": "1.00",
                    "importe": "1.00",
                }
            ],
            "ubicaciones": [
                {
                    "tipo": "Origen",
                    "rfc": "EKU9003173C9",
                    "nombre": "ESCUELA KEMPER URGATE SA DE CV",
                    "fecha": data["fecha"],
                    "distancia": "",
                    "cp": "91808",
                },
                {
                    "tipo": "Destino",
                    "rfc": data["rfc_cliente"],
                    "nombre": data["nombre_cliente"],
                    "fecha": data["fecha"],
                    "distancia": "480",
                    "cp": data["cp_cliente"],
                },
            ],
            "autotransporte": {
                "permiso": data["permiso_sct"],
                "num_permiso": data["num_permiso"],
                "configuracion": data["config_vehicular"],
                "peso": data["peso_bruto_vehicular"],
                "placas": data["placas"],
                "anio": data["anio_modelo"],
                "aseguradora": data["aseguradora"],
                "poliza": data["poliza"],
                "remolque": data["subtipo_remolque"],
                "placa_remolque": data["placa_remolque"],
            },
            "operador": {
                "rfc": data["rfc_operador"],
                "licencia": data["licencia"],
                "nombre": data["nombre_operador"],
            },
        }

        html_renderizado = template.render(context)
        pdf_path = self.storage_dir / f"{uuid}.pdf"
        with open(pdf_path, "wb") as pdf_file:
            pisa.CreatePDF(BytesIO(html_renderizado.encode("utf-8")), dest=pdf_file)

        logger.info(f"📄 PDF Generado satisfactoriamente: {pdf_path.name}")
        return pdf_path

    def _generar_pdf_con_diseno(self, viaje, uuid, qr_bytes, s_sat, s_emi, c_sat, data):
        from jinja2 import Environment, FileSystemLoader
        from xhtml2pdf import pisa

        logo_path = self.templates_dir / "assets" / "logo-black.png"
        logo_src = ""
        if logo_path.exists():
            with open(logo_path, "rb") as img:
                logo_src = f"data:image/png;base64,{base64.b64encode(img.read()).decode('utf-8')}"

        qr_sat_b64 = base64.b64encode(qr_bytes).decode("utf-8")
        qr_src = f"data:image/png;base64,{qr_sat_b64}"

        id_ccp = "CCCe3b8d-a5c4-d91d-2b7a-8951836e3433"
        url_ccp = f"https://verificacfdi.facturaelectronica.sat.gob.mx/verificaccp/default.aspx?IdCCP={id_ccp}&Fecha={data['fecha']}"
        img_qr_ccp = qrcode.make(url_ccp)
        buffered = BytesIO()
        img_qr_ccp.save(buffered, format="PNG")
        qr_ccp_src = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"

        env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        template = env.get_template("carta_porte.html")

        # --- UTILIDAD PARA CORTAR CADENAS LARGAS PARA xhtml2pdf ---
        # Esto inserta un salto de línea HTML (<br/>) cada N caracteres
        def split_string(text, length=100):
            if not text:
                return ""
            return "<br/>".join(
                [text[i : i + length] for i in range(0, len(text), length)]
            )

        # Aquí reconstruimos la cadena original para pasarla al contexto
        cadena_original_str = f"||1.1|{uuid}|{data['fecha']}|{s_sat}||"

        context = {
            "uuid": uuid,
            "folio_interno": data["folio"],
            "fecha_emision": data["fecha"],
            "logo_src": logo_src,
            "qr_src": qr_src,
            "qr_ccp_src": qr_ccp_src,
            "id_ccp": id_ccp,
            "nombre_cliente": data["nombre_cliente"],
            "rfc_cliente": data["rfc_cliente"],
            "cp_cliente": data["cp_cliente"],
            "regimen_cliente": data["regimen_cliente"],
            "uso_cfdi": data["uso_cfdi"],
            "cert_sat": c_sat,
            # PASAMOS LOS SELLOS YA PRE-CORTADOS CON LA FUNCIÓN (cortamos cada 110 caracteres)
            "sello_sat": split_string(s_sat, 110),
            "sello_emisor": split_string(s_emi, 110),
            "cadena_original": split_string(cadena_original_str, 110),
            "subtotal": "1.00",
            "iva": "0.16",
            "retenciones": "0.04",
            "total": "1.12",
            "conceptos": [
                {
                    "clave": "78101802",
                    "cantidad": "1.00",
                    "unidad": "E48 - SRV",
                    "descripcion": "[78101802] FLETE CARGA GENERAL CGMU5751959",
                    "precio_unitario": "1.00",
                    "importe": "1.00",
                }
            ],
            "ubicaciones": [
                {
                    "tipo": "Origen",
                    "rfc": "EKU9003173C9",
                    "nombre": "ESCUELA KEMPER URGATE SA DE CV",
                    "fecha": data["fecha"],
                    "distancia": "",
                    "cp": "91808",
                },
                {
                    "tipo": "Destino",
                    "rfc": data["rfc_cliente"],
                    "nombre": data["nombre_cliente"],
                    "fecha": data["fecha"],
                    "distancia": "480",
                    "cp": data["cp_cliente"],
                },
            ],
            "autotransporte": {
                "permiso": data["permiso_sct"],
                "num_permiso": data["num_permiso"],
                "configuracion": data["config_vehicular"],
                "peso": data["peso_bruto_vehicular"],
                "placas": data["placas"],
                "anio": data["anio_modelo"],
                "aseguradora": data["aseguradora"],
                "poliza": data["poliza"],
                "remolque": data["subtipo_remolque"],
                "placa_remolque": data["placa_remolque"],
            },
            "operador": {
                "rfc": data["rfc_operador"],
                "licencia": data["licencia"],
                "nombre": data["nombre_operador"],
            },
        }

        html_renderizado = template.render(context)
        pdf_path = self.storage_dir / f"{uuid}.pdf"
        with open(pdf_path, "wb") as pdf_file:
            pisa.CreatePDF(BytesIO(html_renderizado.encode("utf-8")), dest=pdf_file)

        logger.info(f"📄 PDF Generado satisfactoriamente: {pdf_path.name}")
        return pdf_path

    def _obtener_datos_completos(self, viaje_id: int):
        viaje = self.db.get(Trip, viaje_id)
        leg = (
            self.db.query(TripLeg)
            .filter(TripLeg.trip_id == viaje_id, TripLeg.unit_id.isnot(None))
            .first()
        )
        cliente = self.db.get(ClientModel, viaje.client_id)
        unidad = self.db.get(Unit, leg.unit_id)
        operador = (
            self.db.get(Operator, leg.operator_id)
            if (leg and leg.operator_id)
            else None
        )
        return viaje, cliente, unidad, operador

    def _guardar_xml_disco(self, xml_bytes: bytes, uuid: str):
        file_path = self.storage_dir / f"{uuid}.xml"
        with open(file_path, "wb") as f:
            f.write(xml_bytes)
