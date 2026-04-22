import os
import base64
import logging
import logging.config
import uuid
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from io import BytesIO

import zeep
from zeep.plugins import HistoryPlugin
from lxml import etree
from fastapi import HTTPException
from sqlalchemy.orm import Session

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_der_private_key
from cryptography.hazmat.backends import default_backend

import qrcode
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

try:
    from num2words import num2words

    HAS_NUM2WORDS = True
except ImportError:
    HAS_NUM2WORDS = False

# 🚀 IMPORTAMOS MODELOS DE FINANZAS
from app.models.models import (
    ReceivableInvoice,
    Client as ClientModel,
    SystemConfig,
    SatLocationCode,
    ReceivableInvoicePayment,
    BankAccount,
    BankMovement,
)

logger = logging.getLogger("billing.audit")


def _clean_float(val) -> float:
    if val is None:
        return 0.0
    try:
        if isinstance(val, str):
            val = val.replace(",", "").strip()
            if not val:
                return 0.0
        return float(val)
    except (ValueError, TypeError):
        return 0.0


class PaymentComplementService:
    """
    MOTOR FINANCIERO DEDICADO A PAGOS:
    Maneja exclusivamente la generación y timbrado de Complementos de Recepción de Pagos 2.0.
    Aislado para no afectar el motor de Carta Porte.
    """

    def __init__(self, db: Session):
        self.db = db
        self.env = os.getenv("ENVIRONMENT", "PROD").upper()
        self.suffix = "_qa" if self.env == "QA" else ""
        logger.info(f"INICIALIZANDO PAYMENT SERVICE EN MODO: {self.env}")

        if self.env == "QA":
            self.wsdl_timbrado = os.getenv(
                "PAC_WSDL_QA",
                "https://testing.solucionfactible.com/ws/services/Timbrado?wsdl",
            )
            self.pac_user = os.getenv("PAC_USER_QA", "testing@solucionfactible.com")
            self.pac_pass = os.getenv("PAC_PASS_QA", "timbrado.SF.16672")
        else:
            self.wsdl_timbrado = os.getenv(
                "PAC_WSDL_PROD",
                "https://solucionfactible.com/ws/services/Timbrado?wsdl",
            )
            self.pac_user = os.getenv("PAC_USER_PROD", "TU_USUARIO_PROD")
            self.pac_pass = os.getenv("PAC_PASS_PROD", "TU_PASS_PROD")

        self.history = HistoryPlugin()
        self.base_path = Path(
            os.getenv("APP_BASE_PATH", Path(__file__).resolve().parents[3])
        )
        self.cert_dir = Path(os.getenv("CERT_DIR", self.base_path / "certs"))
        self.storage_dir = Path(
            os.getenv("STORAGE_DIR", self.base_path / "storage" / "xml_timbrados")
        )
        self.templates_dir = Path(
            os.getenv("TEMPLATES_DIR", self.base_path / "templates")
        )

        cert_conf = (
            self.db.query(SystemConfig)
            .filter_by(key=f"sat_cert_path{self.suffix}")
            .first()
        )
        key_conf = (
            self.db.query(SystemConfig)
            .filter_by(key=f"sat_key_path{self.suffix}")
            .first()
        )
        pass_conf = (
            self.db.query(SystemConfig)
            .filter_by(key=f"sat_key_password{self.suffix}")
            .first()
        )

        self.path_cer = (
            Path(cert_conf.value)
            if cert_conf and cert_conf.value
            else (self.cert_dir / "default.cer")
        )
        self.path_key = (
            Path(key_conf.value)
            if key_conf and key_conf.value
            else (self.cert_dir / "default.key")
        )
        self.key_password = pass_conf.value if pass_conf else "12345678a"

        rfc_conf = (
            self.db.query(SystemConfig)
            .filter_by(key=f"empresa_rfc{self.suffix}")
            .first()
        )
        nombre_conf = (
            self.db.query(SystemConfig)
            .filter_by(key=f"empresa_nombre{self.suffix}")
            .first()
        )
        regimen_conf = (
            self.db.query(SystemConfig)
            .filter_by(key=f"empresa_regimen_fiscal{self.suffix}")
            .first()
        )
        cp_conf = (
            self.db.query(SystemConfig)
            .filter_by(key=f"empresa_cp{self.suffix}")
            .first()
        )

        self.emisor_rfc = (
            rfc_conf.value if rfc_conf and rfc_conf.value else "EKU9003173C9"
        )
        raw_emisor = (
            nombre_conf.value
            if nombre_conf and nombre_conf.value
            else "TRANSPORTES RAPIDOS 3T"
        )
        self.emisor_nombre = (
            "TRANSPORTES RAPIDOS 3T"
            if self.emisor_rfc == "EKU9003173C9"
            else raw_emisor.upper().replace(" S.A. DE C.V.", "").strip()
        )
        self.emisor_regimen = (
            regimen_conf.value if regimen_conf and regimen_conf.value else "624"
        )
        self.emisor_cp = cp_conf.value if cp_conf and cp_conf.value else "91808"

    def _generar_sello_xslt(self, xml_bytes: bytes) -> tuple[str, str]:
        xslt_path = (
            Path(__file__).parent
            / "cadenas_sat_originales_base"
            / "cadenaoriginal_4_0.xslt.xml"
        )
        if not xslt_path.exists():
            raise HTTPException(
                status_code=500, detail=f"XSLT no encontrado en {xslt_path}"
            )

        try:
            parser = etree.XMLParser(
                load_dtd=False, no_network=True, resolve_entities=False
            )
            xslt_doc = etree.parse(str(xslt_path), parser=parser)
            transform = etree.XSLT(xslt_doc)
            xml_doc = etree.fromstring(xml_bytes, parser=parser)
            cadena_original = (
                str(transform(xml_doc))
                .replace('<?xml version="1.0" encoding="UTF-8"?>', "")
                .replace("\n", "")
                .strip()
            )

            with open(self.path_key, "rb") as f:
                private_key = load_der_private_key(
                    f.read(), password=self.key_password.encode()
                )

            signature = private_key.sign(
                cadena_original.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256()
            )
            sello_b64 = base64.b64encode(signature).decode("utf-8")
            return sello_b64, cadena_original
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error en Sello SAT: {str(e)}")

    def _guardar_xml_disco(self, xml_bytes: bytes, uuid: str):
        with open(self.storage_dir / f"{uuid}.xml", "wb") as f:
            f.write(xml_bytes)

    def registrar_pago_y_timbrar_complemento(
        self, client_id, pagos_data, forma_pago, fecha_pago, referencia, cuenta_deposito
    ):
        logger.info(
            f"--- INICIANDO TIMBRADO DE COMPLEMENTO DE PAGO (SERVICIO AISLADO) ---"
        )
        cliente = self.db.query(ClientModel).filter(ClientModel.id == client_id).first()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        facturas_afectadas = []
        total_recibido = Decimal("0.0")
        total_retenciones_iva = Decimal("0.0")
        total_traslados_base_iva16 = Decimal("0.0")
        total_traslados_impuesto_iva16 = Decimal("0.0")
        doctos_relacionados = []

        for pago in pagos_data:
            invoice_id = pago.get("invoice_id")
            monto_abono = Decimal(str(pago.get("monto_pagado", 0)))
            factura = (
                self.db.query(ReceivableInvoice)
                .filter(ReceivableInvoice.id == invoice_id)
                .first()
            )

            if not factura or not factura.uuid:
                raise HTTPException(
                    status_code=400, detail=f"Factura ID {invoice_id} sin timbrar."
                )

            saldo_anterior = Decimal(str(factura.saldo_pendiente))
            if monto_abono <= 0 or monto_abono > saldo_anterior:
                raise HTTPException(
                    status_code=400,
                    detail=f"Monto inválido para factura {factura.folio_interno}.",
                )

            moneda_str = "MXN"
            inv_subtotal = (
                Decimal(str(factura.subtotal)) if factura.subtotal else Decimal("0.0")
            )
            inv_iva = Decimal(str(factura.iva)) if factura.iva else Decimal("0.0")
            inv_ret = (
                Decimal(str(factura.retenciones))
                if factura.retenciones
                else Decimal("0.0")
            )
            inv_total = (
                Decimal(str(factura.monto_total))
                if factura.monto_total
                else Decimal("1.0")
            )

            proporcion = monto_abono / inv_total if inv_total > 0 else Decimal("1.0")
            base_dr = (inv_subtotal * proporcion).quantize(Decimal("0.000001"))
            iva_dr = (inv_iva * proporcion).quantize(Decimal("0.000001"))
            ret_dr = (inv_ret * proporcion).quantize(Decimal("0.000001"))

            # Acumulamos con precisión total para evitar descuadres en el SAT
            total_retenciones_iva += ret_dr
            total_traslados_base_iva16 += base_dr
            total_traslados_impuesto_iva16 += iva_dr
            total_recibido += monto_abono

            folio_split = str(factura.folio_interno).split("-")
            serie_dr = folio_split[0] if len(folio_split) > 1 else ""
            folio_dr = folio_split[-1]

            # Parcialidad Dinámica
            pagos_previos = (
                self.db.query(ReceivableInvoicePayment)
                .filter_by(invoice_id=factura.id)
                .count()
            )
            parcialidad = pagos_previos + 1

            # Objeto Dinámico
            objeto_imp = "02" if (inv_iva > 0 or inv_ret > 0) else "01"

            doctos_relacionados.append(
                {
                    "uuid": factura.uuid,
                    "serie": serie_dr,
                    "folio": folio_dr,
                    "moneda": moneda_str,
                    "saldo_anterior": f"{saldo_anterior:.2f}",
                    "monto_pagado": f"{monto_abono:.2f}",
                    "saldo_insoluto": f"{(saldo_anterior - monto_abono):.2f}",
                    "base_dr": f"{base_dr:.6f}",
                    "iva_dr": f"{iva_dr:.6f}",
                    "ret_dr": f"{ret_dr:.6f}",
                    "tiene_iva": inv_iva > 0,
                    "tiene_retencion": inv_ret > 0,
                    "parcialidad": str(parcialidad),
                    "objeto_imp": objeto_imp,
                }
            )

            factura.saldo_pendiente = float(saldo_anterior - monto_abono)
            factura.estatus = (
                "pagado" if factura.saldo_pendiente <= 0.01 else "pago_parcial"
            )

            if factura.saldo_pendiente <= 0.01:
                factura.saldo_pendiente = 0.0

            facturas_afectadas.append(factura)
            self.db.add(factura)

        fecha_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        fecha_pago_sat = datetime.fromisoformat(fecha_pago.replace("Z", "")).strftime(
            "%Y-%m-%dT12:00:00"
        )
        nombre_limpio = (
            getattr(cliente, "razon_social", "PUBLICO EN GENERAL")
            .upper()
            .replace(" S.A. DE C.V.", "")
            .replace(".", "")
            .strip()
        )

        datos_pago = {
            "folio": f"REP-{int(datetime.now().timestamp())}",
            "fecha": fecha_iso,
            "rfc_cliente": getattr(cliente, "rfc", "XAXX010101000").upper(),
            "nombre_cliente": nombre_limpio,
            "cp_cliente": getattr(cliente, "codigo_postal_fiscal", self.emisor_cp),
            "regimen_cliente": str(getattr(cliente, "regimen_fiscal", "601")),
            "uso_cfdi": "CP01",
            "fecha_pago": fecha_pago_sat,
            "forma_pago": str(forma_pago).strip().zfill(2),
            "monto_total": f"{total_recibido:.2f}",
            "doctos_relacionados": doctos_relacionados,
            "total_retenciones_iva": f"{total_retenciones_iva.quantize(Decimal('0.00')):.2f}",
            "total_traslados_base_iva16": f"{total_traslados_base_iva16.quantize(Decimal('0.00')):.2f}",
            "total_traslados_impuesto_iva16": f"{total_traslados_impuesto_iva16.quantize(Decimal('0.00')):.2f}",
            "cuenta_deposito": cuenta_deposito,  # 🚀 Pasamos el ID de la cuenta para extraer los datos del banco luego
        }

        # 🚀 FIX: Cargamos correctamente el certificado en Base64 real
        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data, default_backend())
            sn_hex = format(cert.serial_number, "x")
            datos_pago["cert_emisor"] = "".join(
                [sn_hex[i] for i in range(1, len(sn_hex), 2)]
            )
            datos_pago["certificado_b64"] = (
                base64.b64encode(cer_data).decode("utf-8").replace("\n", "")
            )

        xml_base = self._armar_xml_pago_sin_sello(datos_pago)
        xml_sellado = self._sellar_xml_pago(xml_base, datos_pago)

        try:
            client_zeep = zeep.Client(self.wsdl_timbrado, plugins=[self.history])
            result = client_zeep.service.timbrar(
                self.pac_user, self.pac_pass, xml_sellado.encode("utf-8"), False
            )

            if int(getattr(result, "status", 0)) != 200:
                raise HTTPException(
                    status_code=400, detail=f"Error PAC: {result.mensaje}"
                )
            res_sat = result.resultados[0]
            if int(getattr(res_sat, "status", 0)) != 200:
                raise HTTPException(
                    status_code=400, detail=f"Error SAT: {res_sat.mensaje}"
                )

            complemento_uuid = res_sat.uuid
            raw_cfdi = res_sat.cfdiTimbrado
            cfdi_bytes = (
                (
                    raw_cfdi.encode("utf-8")
                    if "<cfdi:Comprobante" in raw_cfdi
                    else base64.b64decode(raw_cfdi)
                )
                if isinstance(raw_cfdi, str)
                else raw_cfdi
            )

            self._guardar_xml_disco(cfdi_bytes, complemento_uuid)

            # Extraemos datos para PDF
            root = etree.fromstring(cfdi_bytes)
            ns = {
                "cfdi": "http://www.sat.gob.mx/cfd/4",
                "tfd": "http://www.sat.gob.mx/TimbreFiscalDigital",
            }
            tfd_node = root.xpath("//tfd:TimbreFiscalDigital", namespaces=ns)[0]
            s_sat = tfd_node.get("SelloSAT", "0000")
            c_sat = tfd_node.get("NoCertificadoSAT", "0000")
            s_emi = root.xpath("//cfdi:Comprobante/@Sello", namespaces=ns)[0]

            # 🚀 NUEVO: Extraemos la fecha de certificación exacta del SAT
            fecha_certificacion = tfd_node.get("FechaTimbrado", "")

            cadena_original_tfd = f"||{tfd_node.get('Version', '1.1')}|{complemento_uuid}|{tfd_node.get('FechaTimbrado')}|{tfd_node.get('RfcProvCertif')}|{tfd_node.get('SelloCFD')}|{c_sat}||"

            total_float = _clean_float(datos_pago["monto_total"])
            if HAS_NUM2WORDS:
                entero = int(total_float)
                decimales = int(round((total_float - entero) * 100))
                texto = num2words(entero, lang="es").upper().replace("UNO", "UN")
                importe_letra = f"(*** {texto} PESOS {decimales:02d}/100 MXN ***)"
            else:
                importe_letra = f"(*** {total_float:,.2f} MXN ***)"

            qr_string = f"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id={complemento_uuid}&re={self.emisor_rfc}&rr={datos_pago['rfc_cliente']}&tt={total_float:.2f}&fe={s_emi[-8:]}"
            qr = qrcode.QRCode(version=1, box_size=10, border=2)
            qr.add_data(qr_string)
            qr.make(fit=True)
            buffer = BytesIO()
            qr.make_image(fill_color="black", back_color="white").save(
                buffer, format="PNG"
            )

            datos_pago.update(
                {
                    "subtotal": "0.00",
                    "iva": "0.00",
                    "retenciones": "0.00",
                    "total": datos_pago["monto_total"],
                    "descripcion_concepto": "COMPLEMENTO DE RECEPCIÓN DE PAGOS",
                }
            )

            self._generar_pdf_pago(
                datos_pago,
                complemento_uuid,
                buffer.getvalue(),
                s_sat,
                s_emi,
                c_sat,
                cadena_original_tfd,
                importe_letra,
                fecha_certificacion,  # 🚀 Pasamos la fecha de certificación
            )

        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail=f"Error al timbrar el pago: {str(e)}"
            )

        # =========================================================================
        # 🚀 FIX TESORERÍA: GUARDAR PAGOS Y CREAR MOVIMIENTO BANCARIO
        # =========================================================================
        for factura in facturas_afectadas:
            abono = next(p for p in pagos_data if p["invoice_id"] == factura.id)
            monto_abono_float = float(abono.get("monto_pagado"))

            # 1. Guardar el pago de la factura
            nuevo_pago = ReceivableInvoicePayment(
                invoice_id=factura.id,
                fecha_pago=datetime.fromisoformat(fecha_pago.replace("Z", "")).date(),
                monto=monto_abono_float,
                metodo_pago=forma_pago,
                referencia=referencia,
                cuenta_deposito=cuenta_deposito,
                complemento_uuid=complemento_uuid,
            )
            self.db.add(nuevo_pago)

            # 2. Sumar el dinero al Banco
            if cuenta_deposito:
                banco = (
                    self.db.query(BankAccount)
                    .filter(BankAccount.id == int(cuenta_deposito))
                    .first()
                )
                if banco:
                    nuevo_ingreso = BankMovement(
                        bank_account_id=banco.id,
                        tipo="ingreso",
                        monto=monto_abono_float,
                        fecha=datetime.now(),
                        concepto=f"Cobro Fra. {factura.folio_interno} (REP)",
                        referencia=referencia or f"REP {complemento_uuid[:8]}",
                        conciliado=False,
                    )
                    self.db.add(nuevo_ingreso)
                    # Sumamos el saldo a la cuenta bancaria
                    banco.saldo += monto_abono_float
                    self.db.add(banco)

        self.db.commit()
        return {
            "status": "success",
            "message": "Pago registrado y Complemento timbrado exitosamente.",
            "data": {
                "complemento_uuid": complemento_uuid,
                "total_pagado": float(total_recibido),
                "facturas_afectadas": len(facturas_afectadas),
            },
        }

    def _armar_xml_pago_sin_sello(self, d: dict) -> str:
        doctos_xml = ""
        for doc in d["doctos_relacionados"]:
            impuestos_dr_xml = retenciones_xml = traslados_xml = ""

            if doc["tiene_retencion"]:
                retenciones_xml = f'<pago20:RetencionesDR><pago20:RetencionDR BaseDR="{doc["base_dr"]}" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.040000" ImporteDR="{doc["ret_dr"]}"/></pago20:RetencionesDR>'
            if doc["tiene_iva"]:
                traslados_xml = f'<pago20:TrasladosDR><pago20:TrasladoDR BaseDR="{doc["base_dr"]}" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="{doc["iva_dr"]}"/></pago20:TrasladosDR>'
            if doc["tiene_retencion"] or doc["tiene_iva"]:
                impuestos_dr_xml = f"<pago20:ImpuestosDR>{retenciones_xml}{traslados_xml}</pago20:ImpuestosDR>"

            serie_str = f' Serie="{doc["serie"]}"' if doc.get("serie") else ""

            doctos_xml += f"""<pago20:DoctoRelacionado IdDocumento="{doc['uuid']}"{serie_str} Folio="{doc['folio']}" MonedaDR="{doc['moneda']}" EquivalenciaDR="1" NumParcialidad="{doc['parcialidad']}" ImpSaldoAnt="{doc['saldo_anterior']}" ImpPagado="{doc['monto_pagado']}" ImpSaldoInsoluto="{doc['saldo_insoluto']}" ObjetoImpDR="{doc['objeto_imp']}">{impuestos_dr_xml}</pago20:DoctoRelacionado>"""

        totales_xml = "<pago20:Totales "
        if float(d["total_retenciones_iva"]) > 0:
            totales_xml += f'TotalRetencionesIVA="{d["total_retenciones_iva"]}" '
        if float(d["total_traslados_base_iva16"]) > 0:
            totales_xml += f'TotalTrasladosBaseIVA16="{d["total_traslados_base_iva16"]}" TotalTrasladosImpuestoIVA16="{d["total_traslados_impuesto_iva16"]}" '
        totales_xml += f'MontoTotalPagos="{d["monto_total"]}"/>'

        impuestos_p_xml = retenciones_p_xml = traslados_p_xml = ""

        if float(d["total_retenciones_iva"]) > 0:
            retenciones_p_xml = f'<pago20:RetencionesP><pago20:RetencionP ImpuestoP="002" ImporteP="{d["total_retenciones_iva"]}"/></pago20:RetencionesP>'
        if float(d["total_traslados_base_iva16"]) > 0:
            traslados_p_xml = f'<pago20:TrasladosP><pago20:TrasladoP BaseP="{d["total_traslados_base_iva16"]}" ImpuestoP="002" TipoFactorP="Tasa" TasaOCuotaP="0.160000" ImporteP="{d["total_traslados_impuesto_iva16"]}"/></pago20:TrasladosP>'
        if retenciones_p_xml or traslados_p_xml:
            impuestos_p_xml = f"<pago20:ImpuestosP>{retenciones_p_xml}{traslados_p_xml}</pago20:ImpuestosP>"

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:pago20="http://www.sat.gob.mx/Pagos20" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd" Version="4.0" Fecha="{d['fecha']}" Serie="REP" Folio="{d['folio']}" SubTotal="0" Moneda="XXX" Total="0" TipoDeComprobante="P" Exportacion="01" LugarExpedicion="{self.emisor_cp}">
    <cfdi:Emisor Rfc="{self.emisor_rfc}" Nombre="{self.emisor_nombre}" RegimenFiscal="{self.emisor_regimen}" />
    <cfdi:Receptor Rfc="{d['rfc_cliente']}" Nombre="{d['nombre_cliente']}" DomicilioFiscalReceptor="{d['cp_cliente']}" RegimenFiscalReceptor="{d['regimen_cliente']}" UsoCFDI="{d['uso_cfdi']}" />
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01" />
    </cfdi:Conceptos>
    <cfdi:Complemento>
        <pago20:Pagos Version="2.0">
            {totales_xml}
            <pago20:Pago FechaPago="{d['fecha_pago']}" FormaDePagoP="{d['forma_pago']}" MonedaP="MXN" Monto="{d['monto_total']}" TipoCambioP="1">{doctos_xml}{impuestos_p_xml}</pago20:Pago>
        </pago20:Pagos>
    </cfdi:Complemento>
</cfdi:Comprobante>""".strip()

    def _sellar_xml_pago(self, xml_str, d: dict) -> str:
        # 🚀 FIX CRÍTICO: Usamos el B64 del archivo .cer, no del número de certificado
        cert_b64 = d.get("certificado_b64", "")

        xml_con_cert = xml_str.replace(
            "<cfdi:Comprobante",
            f'<cfdi:Comprobante NoCertificado="{d.get("cert_emisor")}" Certificado="{cert_b64}"',
        )
        sello_b64, _ = self._generar_sello_xslt(xml_con_cert.encode("utf-8"))
        return xml_con_cert.replace(
            "<cfdi:Comprobante", f'<cfdi:Comprobante Sello="{sello_b64}"'
        )

    def _generar_pdf_pago(
        self,
        data,
        uuid,
        qr_bytes,
        s_sat,
        s_emi,
        c_sat,
        cadena_original,
        importe_letra,
        fecha_certificacion,  # 🚀 Agregado aquí
    ):
        logo_path = self.templates_dir / "assets" / "logo-black.png"
        logo_src = (
            f"data:image/png;base64,{base64.b64encode(open(logo_path, 'rb').read()).decode('utf-8')}"
            if logo_path.exists()
            else ""
        )
        qr_src = f"data:image/png;base64,{base64.b64encode(qr_bytes).decode('utf-8')}"

        def chunk_b64(text, length=105):
            if not text:
                return ""
            text = str(text).replace(" ", "").replace("\n", "").replace("\r", "")
            return " ".join([text[i : i + length] for i in range(0, len(text), length)])

        # 🚀 NUEVO: Consultamos el banco destino
        banco_info = None
        if data.get("cuenta_deposito"):
            banco_info = (
                self.db.query(BankAccount)
                .filter(BankAccount.id == int(data["cuenta_deposito"]))
                .first()
            )

        cuenta_benef = banco_info.numero_cuenta if banco_info else "NO IDENTIFICADA"
        banco_benef = banco_info.banco if banco_info else "NO IDENTIFICADO"

        context = {
            **data,
            "uuid": uuid,
            "folio_interno": data["folio"],
            "fecha_emision": data["fecha"],
            "fecha_certificacion": fecha_certificacion,  # 🚀 NUEVO
            "cuenta_beneficiario": cuenta_benef,  # 🚀 NUEVO
            "banco_beneficiario": banco_benef,  # 🚀 NUEVO
            "logo_src": logo_src,
            "qr_src": qr_src,
            "metodo_pago": "PPD",
            "tipo_comprobante": "P (Pago)",
            "moneda": "XXX",
            "tc": "1",
            "cert_sat": c_sat,
            "cert_emisor": data.get("cert_emisor", "00001000000000000000"),
            "sello_sat": chunk_b64(s_sat),
            "sello_emisor": chunk_b64(s_emi),
            "cadena_original": chunk_b64(cadena_original),
            "importe_letra": importe_letra,
            "remitente_nombre": self.emisor_nombre,
            "remitente_rfc": self.emisor_rfc,
            "destinatario_nombre": data.get("nombre_cliente", ""),
            "destinatario_rfc": data.get("rfc_cliente", ""),
            "domicilio_destino": f"{data.get('cp_cliente', '')}",
            "conceptos": [
                {
                    "clave": "84111506",
                    "no_identificacion": "001",
                    "cantidad": "1.00",
                    "unidad": "ACT",
                    "descripcion": "Pago",
                    "detalles_extra": f"Folio Pago: {data['folio']}",
                    "precio": "0.00",
                    "importe": "0.00",
                }
            ],
        }

        env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        # Aquí puedes usar tu mismo HTML de carta porte o crear uno simplificado de pagos
        html_out = env.get_template("complemento_pago.html").render(context)
        pdf_path = self.storage_dir / f"{uuid}.pdf"
        HTML(string=html_out, base_url=self.templates_dir.as_uri()).write_pdf(
            str(pdf_path)
        )
