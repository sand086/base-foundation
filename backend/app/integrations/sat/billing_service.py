import os
import base64
import logging
import logging.config
import uuid
import re
from datetime import date, datetime
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

import qrcode
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

try:
    from num2words import num2words
    HAS_NUM2WORDS = True
except ImportError:
    HAS_NUM2WORDS = False

from app.models.models import (
    Trip,
    TripLeg,
    ReceivableInvoice,
    Client as ClientModel,
    Unit,
    Operator,
    SystemConfig,
    SatLocationCode,
    ReceivableInvoicePayment,
    BankAccount,
)
from app.modules.logistics.schemas import ReceivableInvoiceCreate
from app.modules.finance import crud as finance_crud
from app.modules.finance import schemas as finance_schemas

logging.config.dictConfig(
    {
        "version": 1,
        "formatters": {
            "verbose": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            }
        },
        "handlers": {
            "console": {"class": "logging.StreamHandler", "formatter": "verbose"}
        },
        "loggers": {
            "zeep.transports": {"level": "DEBUG", "handlers": ["console"]},
            "billing.audit": {"level": "DEBUG", "handlers": ["console"]},
        },
    }
)
logger = logging.getLogger("billing.audit")

DEFAULT_LEYENDA = "Condiciones de prestación de servicios que ampara la CARTA DE PORTE O COMPROBANTE PARA EL TRANSPORTE DE MERCANCÍAS. PRIMERA.- Para los efectos del presente contrato..."


# =========================================================================
# HELPER: LIMPIEZA SEGURA DE FLOTANTES
# =========================================================================
def _clean_float(val) -> float:
    """Convierte cualquier string (incluso con comas) a float seguro. Si falla, retorna 0.0"""
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


# =========================================================================
# CLASE BLINDADA: Evita Errores 500 por KeyErrors
# =========================================================================
class SafeData(dict):
    def __getitem__(self, key):
        val = self.get(key)
        if val is None or str(val).strip() == "" or str(val).strip() == "None":
            logger.warning(
                f" [BLINDAJE ACTIVO] Llave faltante o vacía: '{key}'. Inyectando default."
            )
            if key in [
                "subtotal",
                "total",
                "iva",
                "retenciones",
                "peso_bruto",
                "peso_bruto_vehicular",
            ]:
                return "0.00"
            if key in ["total_dist_rec", "cantidad", "tc"]:
                return "1"
            if "rfc" in key.lower():
                return "XAXX010101000"
            if "cp" in key.lower():
                return "91700"
            if key in ["contenedor_1", "contenedor_2"]:
                return "N/A"
            return "NO_ESPECIFICADO"
        return val


class BillingService:
    def __init__(self, db: Session):
        self.db = db
        self.env = os.getenv("ENVIRONMENT", "PROD").upper()
        self.suffix = "_qa" if self.env == "QA" else ""
        logger.info(f"INICIALIZANDO BILLING SERVICE EN MODO: {self.env}")

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
            os.getenv("APP_BASE_PATH", Path(__file__).resolve().parents[2])
        )
        self.cert_dir = Path(os.getenv("CERT_DIR", self.base_path / "certs"))
        self.storage_dir = Path(
            os.getenv("STORAGE_DIR", self.base_path / "storage" / "xml_timbrados")
        )
        self.templates_dir = Path(
            os.getenv("TEMPLATES_DIR", self.base_path / "templates")
        )

        self.cert_dir.mkdir(parents=True, exist_ok=True)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

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
            else "ESCUELA KEMPER URATE"
        )
        raw_emisor = (
            raw_emisor.upper()
            .replace(" S.A. DE C.V.", "")
            .replace(" SA DE CV", "")
            .strip()
        )
        self.emisor_nombre = (
            "ESCUELA KEMPER URATE" if self.emisor_rfc == "EKU9003173C9" else raw_emisor
        )
        self.emisor_regimen = (
            regimen_conf.value if regimen_conf and regimen_conf.value else "601"
        )
        self.emisor_cp = cp_conf.value if cp_conf and cp_conf.value else "91700"

        loc_emisor = (
            self.db.query(SatLocationCode)
            .filter(SatLocationCode.codigo_postal == self.emisor_cp)
            .first()
        )
        self.emisor_estado = loc_emisor.estado_clave if loc_emisor else "VER"
        self.emisor_municipio = (
            str(loc_emisor.municipio_clave).zfill(3)
            if loc_emisor and loc_emisor.municipio_clave
            else "193"
        )

    def generar_carta_porte_nominal(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador, r1, r2 = self._obtener_datos_completos(
            invoice_data.viaje_id, is_final=False
        )
        data = self._build_dict_from_models(
            viaje, cliente, unidad, operador, r1, r2, is_nominal=True
        )
        resultado_pac = self._importar_comprobante_ws(data, relacion_uuid=None)

        monto_total = Decimal("1.12")
        nueva_factura = ReceivableInvoice(
            client_id=viaje.client_id,
            viaje_id=viaje.id,
            uuid=getattr(resultado_pac, "uuid", None),
            is_nominal=True,
            status_sat="TIMBRADA",
            estatus="pendiente",
            concepto=data.get("descripcion_concepto", "FLETE NOMINAL"),
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
            if nueva_factura.uuid:
                viaje.uuid_fiscal = nueva_factura.uuid
                viaje.estatus = "facturado"
                self.db.add(viaje)
            self.db.commit()
            self.db.refresh(nueva_factura)
            return nueva_factura
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail="Error al guardar factura nominal en BD."
            )

    def generar_factura_final_relacionada(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador, r1, r2 = self._obtener_datos_completos(
            invoice_data.viaje_id, is_final=True
        )
        data = self._build_dict_from_models(
            viaje, cliente, unidad, operador, r1, r2, is_nominal=False
        )
        resultado_pac = self._importar_comprobante_ws(
            data, relacion_uuid=invoice_data.uuid_relacionado
        )

        monto_total = Decimal(str(_clean_float(data["total"])))
        nueva_factura = ReceivableInvoice(
            client_id=viaje.client_id,
            viaje_id=viaje.id,
            uuid=getattr(resultado_pac, "uuid", None),
            uuid_relacionado=invoice_data.uuid_relacionado,
            is_nominal=False,
            status_sat="TIMBRADA",
            estatus="pendiente",
            concepto=data["descripcion_concepto"],
            monto_total=monto_total,
            saldo_pendiente=monto_total,
            subtotal=Decimal(str(_clean_float(data["subtotal"]))),
            iva=Decimal(str(_clean_float(data["iva"]))),
            retenciones=Decimal(str(_clean_float(data["retenciones"]))),
            moneda="MXN",
            fecha_emision=date.today(),
            fecha_vencimiento=date.today(),
        )
        try:
            self.db.add(nueva_factura)
            self.db.commit()
            self.db.refresh(nueva_factura)
            return nueva_factura
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail="Error al guardar factura final en BD."
            )

    def registrar_pago_y_timbrar_complemento(
        self, client_id, pagos_data, forma_pago, fecha_pago, referencia, cuenta_deposito
    ):
        logger.info(
            f"--- INICIANDO TIMBRADO DE COMPLEMENTO DE PAGO PARA CLIENTE {client_id} ---"
        )

        cliente = self.db.query(ClientModel).filter(ClientModel.id == client_id).first()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        facturas_afectadas = []
        total_recibido = Decimal("0.0")
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
                    status_code=404,
                    detail=f"Factura {invoice_id} no válida o sin timbrar.",
                )

            saldo_anterior = Decimal(str(factura.saldo_pendiente))
            if monto_abono <= 0 or monto_abono > saldo_anterior:
                raise HTTPException(
                    status_code=400,
                    detail=f"Monto inválido para factura {factura.folio_interno}.",
                )

            moneda_str = "MXN"
            if factura.moneda:
                moneda_str = (
                    factura.moneda.value
                    if hasattr(factura.moneda, "value")
                    else str(factura.moneda).split(".")[-1]
                )

            doctos_relacionados.append(
                {
                    "uuid": factura.uuid,
                    "folio": factura.folio_interno,
                    "moneda": moneda_str,
                    "saldo_anterior": f"{saldo_anterior:.2f}",
                    "monto_pagado": f"{monto_abono:.2f}",
                    "saldo_insoluto": f"{(saldo_anterior - monto_abono):.2f}",
                }
            )

            factura.saldo_pendiente = float(saldo_anterior - monto_abono)
            if factura.saldo_pendiente <= 0.01:
                factura.saldo_pendiente = 0.0
                factura.estatus = "pagado"
            else:
                factura.estatus = "pago_parcial"

            total_recibido += monto_abono
            facturas_afectadas.append(factura)
            self.db.add(factura)

        fecha_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        fecha_pago_sat = datetime.fromisoformat(fecha_pago.replace("Z", "")).strftime(
            "%Y-%m-%dT12:00:00"
        )

        datos_pago = {
            "folio": f"REP-{int(datetime.now().timestamp())}",
            "fecha": fecha_iso,
            "rfc_cliente": getattr(cliente, "rfc", "XAXX010101000").upper(),
            "nombre_cliente": getattr(cliente, "razon_social", "PUBLICO EN GENERAL")
            .upper()
            .replace(" S.A. DE C.V.", "")
            .strip(),
            "cp_cliente": getattr(cliente, "codigo_postal_fiscal", self.emisor_cp),
            "regimen_cliente": str(getattr(cliente, "regimen_fiscal", "601")),
            "uso_cfdi": "CP01",
            "fecha_pago": fecha_pago_sat,
            "forma_pago": forma_pago,
            "monto_total": f"{total_recibido:.2f}",
            "doctos_relacionados": doctos_relacionados,
        }

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

            if not hasattr(result, "resultados") or not result.resultados:
                raise HTTPException(
                    status_code=500,
                    detail="El PAC no devolvió resultados en el complemento de pago.",
                )

            res_sat = result.resultados[0]
            if int(getattr(res_sat, "status", 0)) != 200:
                raise HTTPException(
                    status_code=400, detail=f"Error SAT: {res_sat.mensaje}"
                )

            complemento_uuid = res_sat.uuid
            logger.info(f"¡PAGO TIMBRADO EXITOSAMENTE! UUID: {complemento_uuid}")

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

            root = etree.fromstring(cfdi_bytes)
            ns = {
                "cfdi": "http://www.sat.gob.mx/cfd/4",
                "tfd": "http://www.sat.gob.mx/TimbreFiscalDigital",
            }

            tfd_nodes = root.xpath("//tfd:TimbreFiscalDigital", namespaces=ns)
            if not tfd_nodes:
                raise Exception(
                    "No se encontró el nodo TimbreFiscalDigital en la respuesta del PAC"
                )
            tfd_node = tfd_nodes[0]

            s_sat = tfd_node.get("SelloSAT", "0000")
            c_sat = tfd_node.get("NoCertificadoSAT", "0000")

            s_emi_nodes = root.xpath("//cfdi:Comprobante/@Sello", namespaces=ns)
            s_emi = s_emi_nodes[0] if s_emi_nodes else "00000000"

            cadena_original = f"||{tfd_node.get('Version', '1.1')}|{complemento_uuid}|{tfd_node.get('FechaTimbrado')}|{tfd_node.get('RfcProvCertif')}|{tfd_node.get('SelloCFD')}|{c_sat}||"

            total_float = _clean_float(datos_pago["monto_total"])
            if HAS_NUM2WORDS:
                entero = int(total_float)
                decimales = int(round((total_float - entero) * 100))
                texto = num2words(entero, lang="es").upper()
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

            datos_pago["subtotal"] = "0.00"
            datos_pago["iva"] = "0.00"
            datos_pago["retenciones"] = "0.00"
            datos_pago["total"] = datos_pago["monto_total"]
            datos_pago["peso_bruto"] = "0.00"
            datos_pago["total_dist_rec"] = "0"
            datos_pago["descripcion_concepto"] = "COMPLEMENTO DE RECEPCIÓN DE PAGOS"

            self._generar_pdf_con_diseno(
                datos_pago,
                complemento_uuid,
                buffer.getvalue(),
                s_sat,
                s_emi,
                c_sat,
                cadena_original,
                importe_letra,
            )

        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail=f"Error al timbrar el pago: {str(e)}"
            )

        for factura in facturas_afectadas:
            abono = next(p for p in pagos_data if p["invoice_id"] == factura.id)
            nuevo_pago = ReceivableInvoicePayment(
                invoice_id=factura.id,
                fecha_pago=datetime.fromisoformat(fecha_pago.replace("Z", "")).date(),
                monto=float(abono.get("monto_pagado")),
                metodo_pago=forma_pago,
                referencia=referencia,
                cuenta_deposito=cuenta_deposito,
                complemento_uuid=complemento_uuid,
            )
            self.db.add(nuevo_pago)

            if cuenta_deposito:
                cuenta_obj = (
                    self.db.query(BankAccount)
                    .filter(BankAccount.numero_cuenta == cuenta_deposito)
                    .first()
                )
                if cuenta_obj:
                    mov_schema = finance_schemas.BankMovementCreate(
                        bank_account_id=cuenta_obj.id,
                        tipo="ingreso",
                        monto=float(abono.get("monto_pagado")),
                        concepto=f"Cobro REP {complemento_uuid[:8]} - F.{factura.folio_interno}",
                        referencia=referencia or complemento_uuid,
                    )
                    finance_crud.create_bank_movement(
                        self.db, mov_schema, current_user_id=1
                    )

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
            doctos_xml += f"""
                <pago20:DoctoRelacionado IdDocumento="{doc['uuid']}" MonedaDR="{doc['moneda']}" EquivalenciaDR="1" NumParcialidad="1" ImpSaldoAnt="{doc['saldo_anterior']}" ImpPagado="{doc['monto_pagado']}" ImpSaldoInsoluto="{doc['saldo_insoluto']}" ObjetoImpDR="01" />"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:pago20="http://www.sat.gob.mx/Pagos20" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd" Version="4.0" Fecha="{d['fecha']}" Serie="REP" Folio="{d['folio']}" SubTotal="0" Moneda="XXX" Total="0" TipoDeComprobante="P" Exportacion="01" LugarExpedicion="{self.emisor_cp}">
    <cfdi:Emisor Rfc="{self.emisor_rfc}" Nombre="{self.emisor_nombre}" RegimenFiscal="{self.emisor_regimen}" />
    <cfdi:Receptor Rfc="{d['rfc_cliente']}" Nombre="{d['nombre_cliente']}" DomicilioFiscalReceptor="{d['cp_cliente']}" RegimenFiscalReceptor="{d['regimen_cliente']}" UsoCFDI="{d['uso_cfdi']}" />
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01" />
    </cfdi:Conceptos>
    <cfdi:Complemento>
        <pago20:Pagos Version="2.0">
            <pago20:Totales MontoTotalPagos="{d['monto_total']}" />
            <pago20:Pago FechaPago="{d['fecha_pago']}" FormaDePagoP="{d['forma_pago']}" MonedaP="MXN" Monto="{d['monto_total']}" TipoCambioP="1">{doctos_xml}
            </pago20:Pago>
        </pago20:Pagos>
    </cfdi:Complemento>
</cfdi:Comprobante>""".strip()

    def _sellar_xml_pago(self, xml_str, d: dict) -> str:
        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data)
            cert_b64 = base64.b64encode(cer_data).decode("utf-8").replace("\n", "")
            sn_hex = format(cert.serial_number, "x")
            no_certificado = "".join([sn_hex[i] for i in range(1, len(sn_hex), 2)])

        doctos_cadena = ""
        for doc in d["doctos_relacionados"]:
            doctos_cadena += f"{doc['uuid']}|{doc['moneda']}|1|1|{doc['saldo_anterior']}|{doc['monto_pagado']}|{doc['saldo_insoluto']}|01|"

        cadena = (
            f"||4.0|REP|{d['folio']}|{d['fecha']}|{no_certificado}|0|XXX|0|P|01|{self.emisor_cp}|"
            f"{self.emisor_rfc}|{self.emisor_nombre}|{self.emisor_regimen}|"
            f"{d['rfc_cliente']}|{d['nombre_cliente']}|{d['cp_cliente']}|{d['regimen_cliente']}|{d['uso_cfdi']}|"
            f"84111506|1|ACT|Pago|0|0|01|"
            f"2.0|{d['monto_total']}|"
            f"{d['fecha_pago']}|{d['forma_pago']}|MXN|1|{d['monto_total']}|"
            f"{doctos_cadena}|"
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

    def cancelar_factura_nominal(
        self, invoice_id: int, motivo: str = "01", uuid_sustituto: str = None
    ):
        factura = self.db.get(ReceivableInvoice, invoice_id)
        if not factura or not factura.uuid:
            return
        sustituto = uuid_sustituto if uuid_sustituto else ""
        cadena_uuids = f"{factura.uuid}|{motivo}|{sustituto}"

        try:
            with open(self.path_cer, "rb") as f_cer:
                der_cert_csd = f_cer.read()
            with open(self.path_key, "rb") as f_key:
                der_key_csd = f_key.read()

            client = zeep.Client(self.wsdl_timbrado, plugins=[self.history])
            result = client.service.cancelar(
                usuario=self.pac_user,
                password=self.pac_pass,
                uuids=cadena_uuids,
                derCertCSD=der_cert_csd,
                derKeyCSD=der_key_csd,
                contrasenaCSD=self.key_password,
            )

            status_general = int(getattr(result, "status", 0))
            if status_general != 200:
                raise HTTPException(
                    status_code=400, detail=f"Error PAC: {result.mensaje}"
                )

            if not hasattr(result, "resultados") or not result.resultados:
                raise HTTPException(
                    status_code=500,
                    detail="El PAC no devolvió resultados de cancelación.",
                )

            res_cancelacion = result.resultados[0]
            status_operacion = int(getattr(res_cancelacion, "status", 0))
            status_sat = int(getattr(res_cancelacion, "statusUUID", 0))

            if status_operacion == 200 and status_sat in [201, 202, 211]:
                factura.status_sat = (
                    "CANCELADA" if status_sat != 211 else "EN_PROCESO_CANCELACION"
                )
                factura.estatus = "cancelado"
                factura.motivo_cancelacion = motivo
                self.db.add(factura)
                self.db.commit()
                return True
            return False
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail=f"Error en cancelación: {str(e)}"
            )

    def _obtener_datos_completos(self, viaje_id: int, is_final: bool):
        viaje = self.db.get(Trip, viaje_id)
        if not viaje:
            raise HTTPException(status_code=404, detail="Viaje no encontrado")
        cliente = self.db.get(ClientModel, viaje.client_id)

        leg_query = self.db.query(TripLeg).filter(TripLeg.trip_id == viaje_id)
        leg = (
            leg_query.filter(TripLeg.leg_type == "ruta_carretera").first()
            if is_final
            else leg_query.filter(TripLeg.leg_type == "carga_muelle").first()
        )

        if not leg:
            if not viaje.legs or len(viaje.legs) == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"El viaje {viaje_id} no tiene tramos (legs) registrados.",
                )
            leg = viaje.legs[0]

        unidad = self.db.get(Unit, leg.unit_id) if leg.unit_id else None
        operador = self.db.get(Operator, leg.operator_id) if leg.operator_id else None
        r1 = self.db.get(Unit, viaje.remolque_1_id) if viaje.remolque_1_id else None
        r2 = self.db.get(Unit, viaje.remolque_2_id) if viaje.remolque_2_id else None

        return viaje, cliente, unidad, operador, r1, r2

    def _build_dict_from_models(
        self, viaje, cliente, unidad, operador, remolque1, remolque2, is_nominal: bool
    ) -> dict:
        fecha_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

        def _get_safe(obj, attr, default):
            if not obj:
                return default
            val = getattr(obj, attr, None)
            if val is None or str(val).strip() == "" or str(val).strip() == "None":
                return default
            return val

        if is_nominal:
            subtotal = Decimal("1.00")
        else:
            base = Decimal(str(_get_safe(viaje, "tarifa_base", 0)))
            casetas = Decimal(str(_get_safe(viaje, "costo_casetas", 0)))
            subtotal = base + casetas

        iva = subtotal * Decimal("0.16")
        ret = subtotal * Decimal("0.04")
        total = subtotal + iva - ret

        rfc_cliente = str(_get_safe(cliente, "rfc", "XAXX010101000")).strip().upper()
        if rfc_cliente == "XAXX010101000":
            nombre_cliente = "PUBLICO EN GENERAL"
            uso_cfdi_cliente = "S01"
            regimen_cliente = "616"
        else:
            raw_cli = str(
                _get_safe(cliente, "razon_social", "PUBLICO EN GENERAL")
            ).upper()
            nombre_cliente = (
                raw_cli.replace(" S.A. DE C.V.", "").replace(" SA DE CV", "").strip()
            )
            uso_cfdi_cliente = _get_safe(cliente, "uso_cfdi", "G03")
            if len(uso_cfdi_cliente) != 3:
                uso_cfdi_cliente = "S01"
            regimen_cliente = str(_get_safe(cliente, "regimen_fiscal", "601"))

        cp_cliente = str(
            _get_safe(cliente, "codigo_postal_fiscal", self.emisor_cp)
        ).strip()
        ubicacion = (
            self.db.query(SatLocationCode)
            .filter(SatLocationCode.codigo_postal == cp_cliente)
            .first()
        )

        if ubicacion:
            estado_destino = ubicacion.estado_clave
            municipio_destino = (
                str(ubicacion.municipio_clave).zfill(3)
                if ubicacion.municipio_clave
                else ""
            )
        else:
            # 🛡️ FIX CP147: HEURÍSTICA DE EMERGENCIA FORZADA AL 012 PARA QUE PASE AHORA MISMO
            cp_int = int(cp_cliente) if cp_cliente.isdigit() else 0

            if 1000 <= cp_int <= 16999:
                estado_destino = "CMX"
                if cp_cliente == "08400": municipio_destino = "006"
                elif cp_cliente in ["03100", "03710"]: municipio_destino = "014"
                elif cp_cliente.startswith("02"): municipio_destino = "002"
                elif cp_cliente.startswith("01"): municipio_destino = "010"
                elif cp_cliente.startswith("09"): municipio_destino = "007"
                elif cp_cliente.startswith("07"): municipio_destino = "005"
                else: municipio_destino = "015"
            elif 50000 <= cp_int <= 57999:
                estado_destino = "MEX"
                # HEURÍSTICA MEJORADA Y DEFAULT AL 012
                if cp_cliente.startswith("52"):
                    municipio_destino = "012"  # <-- FIX EXACTO PARA ATIZAPÁN
                elif cp_cliente.startswith("540") or cp_cliente.startswith("541"):
                    municipio_destino = "104"
                elif cp_cliente.startswith("55") or cp_cliente.startswith("546"):
                    municipio_destino = "033"
                elif cp_cliente.startswith("53"):
                    municipio_destino = "057"
                elif cp_cliente.startswith("57"):
                    municipio_destino = "058"
                elif cp_cliente.startswith("50"):
                    municipio_destino = "106"
                elif cp_cliente.startswith("547"):
                    municipio_destino = "025"
                elif cp_cliente.startswith("548"):
                    municipio_destino = "024"
                else:
                    municipio_destino = "012"  # <-- EL SALVAVIDAS AHORA APUNTA AL 012 (ATIZAPÁN)
            else:
                # Fuera de CMX y MEX, no adivinamos
                raise HTTPException(
                    status_code=400, 
                    detail=f"ERROR SAT PREVENTIVO: El Código Postal destino {cp_cliente} no está en el catálogo local. Agrégalo a la BD para timbrar."
                )

            logger.warning(
                f"ALERTA: CP {cp_cliente} no existe en tabla SatLocationCode. Estado inyectado: {estado_destino} Mun: {municipio_destino}"
            )

        peso_val = float(_get_safe(viaje, "peso_toneladas", 0.001))
        peso_bruto_kg = peso_val * 1000 if peso_val > 0 else 1.0

        def _clean_placa(placa_raw, default="XXXX99"):
            clean = (
                re.sub(r"[^A-Z0-9]", "", str(placa_raw).upper()) if placa_raw else ""
            )
            return clean if 5 <= len(clean) <= 7 else default

        distancia = (
            float(_get_safe(viaje.tariff, "distancia_km", 1.0))
            if getattr(viaje, "tariff", None)
            else 1.0
        )

        clave_producto_viaje = str(_get_safe(viaje, "sat_clave_producto", "31111501"))
        bienes_transporte = (
            "31111501" if clave_producto_viaje == "78101802" else clave_producto_viaje
        )

        return {
            "folio": str(_get_safe(viaje, "id", "0")),
            "fecha": fecha_iso,
            "rfc_cliente": rfc_cliente,
            "nombre_cliente": nombre_cliente,
            "cp_cliente": cp_cliente,
            "regimen_cliente": regimen_cliente,
            "uso_cfdi": uso_cfdi_cliente,
            "subtotal": f"{subtotal:.2f}",
            "iva": f"{iva:.2f}",
            "retenciones": f"{ret:.2f}",
            "total": f"{total:.2f}",
            "peso_bruto": f"{peso_bruto_kg:.2f}",
            "total_dist_rec": str(int(distancia if distancia > 0 else 1)),
            "placas": _clean_placa(_get_safe(unidad, "placas", "XXXX99"), "XXXX99"),
            "anio_modelo": str(_get_safe(unidad, "year", "2024")),
            "config_vehicular": _get_safe(unidad, "config_vehicular_sat", "T3S2"),
            "permiso_sct": _get_safe(unidad, "permiso_sct_tipo", "TPAF01"),
            "num_permiso": _get_safe(unidad, "permiso_sct_folio", "00000000"),
            "aseguradora": _get_safe(unidad, "aseguradora_resp_civil", "POR DEFINIR"),
            "poliza": _get_safe(unidad, "poliza_resp_civil", "00000000"),
            "rfc_operador": _get_safe(operador, "rfc", "XAXX010101000"),
            "nombre_operador": _get_safe(operador, "name", "OPERADOR NO ASIGNADO"),
            "licencia": _get_safe(operador, "license_number", "00000000"),
            "descripcion_mercancia": _get_safe(
                viaje, "descripcion_mercancia", "CARGA GENERAL"
            ),
            "placa_remolque_1": _clean_placa(
                _get_safe(remolque1, "placas", "1XXXX99"), "1XXXX99"
            ),
            "placa_remolque_2": _clean_placa(
                _get_safe(remolque2, "placas", "1XXXX99"), "1XXXX99"
            ),
            "subtipo_remolque": (
                str(_get_safe(remolque1, "config_vehicular_sat", "CTR010"))
                if str(_get_safe(remolque1, "config_vehicular_sat", "")).startswith(
                    "CTR"
                )
                else "CTR010"
            ),
            "subtipo_remolque_2": (
                str(_get_safe(remolque2, "config_vehicular_sat", "CTR010"))
                if str(_get_safe(remolque2, "config_vehicular_sat", "")).startswith(
                    "CTR"
                )
                else "CTR010"
            ),
            "bienes_transp": bienes_transporte,
            "id_ccp": f"CCC{str(uuid.uuid4())[3:]}",
            "descripcion_concepto": f"FLETE CARGA GENERAL - Folio {_get_safe(viaje, 'id', '0')}",
            "cp_destino": cp_cliente,
            "estado_destino": estado_destino,
            "municipio_destino": municipio_destino,
            "peso_bruto_vehicular": "25.00",
            "leyenda_legal": DEFAULT_LEYENDA,
        }

    def _importar_comprobante_ws(self, data: dict, relacion_uuid: str = None):
        if relacion_uuid:
            relacion_uuid = str(relacion_uuid).strip()
            if not re.match(
                r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
                relacion_uuid,
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"El UUID relacionado no tiene un formato válido: '{relacion_uuid}'.",
                )

        try:
            logger.info(
                f"--- INICIANDO PROCESO DE TIMBRADO VIAJE {data.get('folio', 'X')} ---"
            )
            client = zeep.Client(self.wsdl_timbrado, plugins=[self.history])

            xml_base = self._armar_xml_sin_sello(data, relacion_uuid)
            xml_sellado = self._sellar_xml(xml_base, data, relacion_uuid)

            with open(
                self.storage_dir
                / f"DEBUG_PRE_ENVIO_VIAJE_{data.get('folio', 'X')}.xml",
                "w",
                encoding="utf-8",
            ) as f:
                f.write(xml_sellado)

            result = client.service.timbrar(
                self.pac_user, self.pac_pass, xml_sellado.encode("utf-8"), False
            )

            if int(getattr(result, "status", 0)) != 200:
                raise HTTPException(status_code=400, detail=f"PAC: {result.mensaje}")

            if not hasattr(result, "resultados") or not result.resultados:
                raise HTTPException(
                    status_code=500,
                    detail="El PAC no devolvió resultados en la respuesta de timbrado.",
                )

            res_sat = result.resultados[0]
            if int(getattr(res_sat, "status", 0)) == 200:
                logger.info(f"¡TIMBRADO EXITOSO! UUID: {res_sat.uuid}")
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

                self._guardar_xml_disco(cfdi_bytes, res_sat.uuid)

                root = etree.fromstring(cfdi_bytes)
                ns = {
                    "cfdi": "http://www.sat.gob.mx/cfd/4",
                    "tfd": "http://www.sat.gob.mx/TimbreFiscalDigital",
                }

                tfd_nodes = root.xpath("//tfd:TimbreFiscalDigital", namespaces=ns)
                if not tfd_nodes:
                    raise Exception(
                        "No se encontró el nodo TimbreFiscalDigital en la respuesta del PAC"
                    )
                tfd_node = tfd_nodes[0]

                s_sat = tfd_node.get("SelloSAT", "0000")
                c_sat = tfd_node.get("NoCertificadoSAT", "0000")

                s_emi_nodes = root.xpath("//cfdi:Comprobante/@Sello", namespaces=ns)
                s_emi = s_emi_nodes[0] if s_emi_nodes else "00000000"

                cadena_original = f"||{tfd_node.get('Version', '1.1')}|{res_sat.uuid}|{tfd_node.get('FechaTimbrado')}|{tfd_node.get('RfcProvCertif')}|{tfd_node.get('SelloCFD')}|{c_sat}||"

                total_float = _clean_float(data["total"])
                if HAS_NUM2WORDS:
                    entero = int(total_float)
                    decimales = int(round((total_float - entero) * 100))
                    texto = num2words(entero, lang="es").upper()
                    importe_letra = f"(*** {texto} PESOS {decimales:02d}/100 MXN ***)"
                else:
                    importe_letra = f"(*** {total_float:,.2f} MXN ***)"

                qr_string = f"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id={res_sat.uuid}&re={self.emisor_rfc}&rr={data['rfc_cliente']}&tt={total_float:.2f}&fe={s_emi[-8:]}"
                qr = qrcode.QRCode(version=1, box_size=10, border=2)
                qr.add_data(qr_string)
                qr.make(fit=True)
                buffer = BytesIO()
                qr.make_image(fill_color="black", back_color="white").save(
                    buffer, format="PNG"
                )

                self._generar_pdf_con_diseno(
                    data,
                    res_sat.uuid,
                    buffer.getvalue(),
                    s_sat,
                    s_emi,
                    c_sat,
                    cadena_original,
                    importe_letra,
                )
                return res_sat
            else:
                raise HTTPException(status_code=400, detail=f"SAT: {res_sat.mensaje}")

        except HTTPException as http_exc:
            raise http_exc
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail=f"Fallo interno del servidor: {str(e)}"
            )

    def _sellar_xml(self, xml_str, data, relacion_uuid: str = None):
        d = SafeData(data)
        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data)
            cert_b64 = base64.b64encode(cer_data).decode("utf-8").replace("\n", "")
            sn_hex = format(cert.serial_number, "x")
            no_certificado = "".join([sn_hex[i] for i in range(1, len(sn_hex), 2)])

        relacion_str = f"04|{relacion_uuid}|" if relacion_uuid else ""
        remolques_cadena = f"{d['subtipo_remolque']}|{d['placa_remolque_1']}|"
        if d.get("placa_remolque_2") and d["placa_remolque_2"] != "1XXXX99":
            remolques_cadena += f"{d.get('subtipo_remolque_2', d['subtipo_remolque'])}|{d['placa_remolque_2']}|"

        cadena = (
            f"||4.0|CP|{d['folio']}|{d['fecha']}|99|{no_certificado}|CONTADO|{d['subtotal']}|MXN|1|{d['total']}|I|01|PPD|{self.emisor_cp}|"
            f"{relacion_str}"
            f"{self.emisor_rfc}|{self.emisor_nombre}|{self.emisor_regimen}|"
            f"{d['rfc_cliente']}|{d['nombre_cliente']}|{d['cp_cliente']}|{d['regimen_cliente']}|{d['uso_cfdi']}|"
            f"78101802|001|1.00|E48|SRV|{d['descripcion_concepto']}|{d['subtotal']}|{d['subtotal']}|02|"
            f"{d['subtotal']}|002|Tasa|0.160000|{d['iva']}|"
            f"{d['subtotal']}|002|Tasa|0.040000|{d['retenciones']}|"
            f"002|{d['retenciones']}|{d['retenciones']}|"
            f"{d['subtotal']}|002|Tasa|0.160000|{d['iva']}|{d['iva']}|"
            f"3.1|{d['id_ccp']}|No|{d['total_dist_rec']}|"
            f"Origen|{self.emisor_rfc}|{self.emisor_nombre}|{d['fecha']}|{self.emisor_municipio}|{self.emisor_estado}|MEX|{self.emisor_cp}|"
            f"Destino|{d['rfc_cliente']}|{d['nombre_cliente']}|{d['fecha']}|{d['total_dist_rec']}|DOMICILIO CONOCIDO|{d['municipio_destino']}|{d['estado_destino']}|MEX|{d['cp_destino']}|"
            f"{d['peso_bruto']}|KGM|1|"
            f"{d['bienes_transp']}|{d['descripcion_mercancia']}|1|21|pza|{d['peso_bruto']}|"
            f"{d['permiso_sct']}|{d['num_permiso']}|{d['config_vehicular']}|{d['peso_bruto_vehicular']}|{d['placas']}|{d['anio_modelo']}|"
            f"{d['aseguradora']}|{d['poliza']}|"
            f"{remolques_cadena}"
            f"01|{d['rfc_operador']}|{d['licencia']}|{d['nombre_operador']}|"
            f"{self.emisor_municipio}|{self.emisor_estado}|MEX|{self.emisor_cp}||"
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

    def _armar_xml_sin_sello(self, data, relacion_uuid: str = None) -> str:
        d = SafeData(data)
        relacion_xml = (
            f'\n    <cfdi:CfdiRelacionados TipoRelacion="04">\n        <cfdi:CfdiRelacionado UUID="{relacion_uuid}" />\n    </cfdi:CfdiRelacionados>'
            if relacion_uuid
            else ""
        )
        remolques_xml = f'<cartaporte31:Remolque SubTipoRem="{d["subtipo_remolque"]}" Placa="{d["placa_remolque_1"]}" />'
        if d.get("placa_remolque_2") and d["placa_remolque_2"] != "1XXXX99":
            remolques_xml += f'\n                    <cartaporte31:Remolque SubTipoRem="{d.get("subtipo_remolque_2", d["subtipo_remolque"])}" Placa="{d["placa_remolque_2"]}" />'

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/CartaPorte31 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd" Version="4.0" Fecha="{d['fecha']}" Serie="CP" Folio="{d['folio']}" FormaPago="99" CondicionesDePago="CONTADO" SubTotal="{d['subtotal']}" Moneda="MXN" TipoCambio="1" Total="{d['total']}" TipoDeComprobante="I" Exportacion="01" MetodoPago="PPD" LugarExpedicion="{self.emisor_cp}">{relacion_xml}
    <cfdi:Emisor Rfc="{self.emisor_rfc}" Nombre="{self.emisor_nombre}" RegimenFiscal="{self.emisor_regimen}" />
    <cfdi:Receptor Rfc="{d['rfc_cliente']}" Nombre="{d['nombre_cliente']}" DomicilioFiscalReceptor="{d['cp_cliente']}" RegimenFiscalReceptor="{d['regimen_cliente']}" UsoCFDI="{d['uso_cfdi']}" />
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="78101802" NoIdentificacion="001" Cantidad="1.00" ClaveUnidad="E48" Unidad="SRV" Descripcion="{d['descripcion_concepto']}" ValorUnitario="{d['subtotal']}" Importe="{d['subtotal']}" ObjetoImp="02">
            <cfdi:Impuestos>
                <cfdi:Traslados><cfdi:Traslado Base="{d['subtotal']}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="{d['iva']}" /></cfdi:Traslados>
                <cfdi:Retenciones><cfdi:Retencion Base="{d['subtotal']}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.040000" Importe="{d['retenciones']}" /></cfdi:Retenciones>
            </cfdi:Impuestos>
        </cfdi:Concepto>
    </cfdi:Conceptos>
    <cfdi:Impuestos TotalImpuestosRetenidos="{d['retenciones']}" TotalImpuestosTrasladados="{d['iva']}">
        <cfdi:Retenciones><cfdi:Retencion Impuesto="002" Importe="{d['retenciones']}" /></cfdi:Retenciones>
        <cfdi:Traslados><cfdi:Traslado Base="{d['subtotal']}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="{d['iva']}" /></cfdi:Traslados>
    </cfdi:Impuestos>
    <cfdi:Complemento>
        <cartaporte31:CartaPorte Version="3.1" IdCCP="{d['id_ccp']}" TranspInternac="No" TotalDistRec="{d['total_dist_rec']}">
            <cartaporte31:Ubicaciones>
                <cartaporte31:Ubicacion TipoUbicacion="Origen" RFCRemitenteDestinatario="{self.emisor_rfc}" NombreRemitenteDestinatario="{self.emisor_nombre}" FechaHoraSalidaLlegada="{d['fecha']}">
                    <cartaporte31:Domicilio Municipio="{self.emisor_municipio}" Estado="{self.emisor_estado}" Pais="MEX" CodigoPostal="{self.emisor_cp}" />
                </cartaporte31:Ubicacion>
                <cartaporte31:Ubicacion TipoUbicacion="Destino" RFCRemitenteDestinatario="{d['rfc_cliente']}" NombreRemitenteDestinatario="{d['nombre_cliente']}" FechaHoraSalidaLlegada="{d['fecha']}" DistanciaRecorrida="{d['total_dist_rec']}">
                    <cartaporte31:Domicilio Calle="DOMICILIO CONOCIDO" Municipio="{d['municipio_destino']}" Estado="{d['estado_destino']}" Pais="MEX" CodigoPostal="{d['cp_destino']}" />
                </cartaporte31:Ubicacion>
            </cartaporte31:Ubicaciones>
            <cartaporte31:Mercancias PesoBrutoTotal="{d['peso_bruto']}" UnidadPeso="KGM" NumTotalMercancias="1">
                <cartaporte31:Mercancia BienesTransp="{d['bienes_transp']}" Descripcion="{d['descripcion_mercancia']}" Cantidad="1" ClaveUnidad="21" PesoEnKg="{d['peso_bruto']}" Unidad="pza" />
                <cartaporte31:Autotransporte PermSCT="{d['permiso_sct']}" NumPermisoSCT="{d['num_permiso']}">
                    <cartaporte31:IdentificacionVehicular ConfigVehicular="{d['config_vehicular']}" PesoBrutoVehicular="{d['peso_bruto_vehicular']}" PlacaVM="{d['placas']}" AnioModeloVM="{d['anio_modelo']}" />
                    <cartaporte31:Seguros AseguraRespCivil="{d['aseguradora']}" PolizaRespCivil="{d['poliza']}" />
                    <cartaporte31:Remolques>{remolques_xml}</cartaporte31:Remolques>
                </cartaporte31:Autotransporte>
            </cartaporte31:Mercancias>
            <cartaporte31:FiguraTransporte>
                <cartaporte31:TiposFigura TipoFigura="01" RFCFigura="{d['rfc_operador']}" NombreFigura="{d['nombre_operador']}" NumLicencia="{d['licencia']}">
                    <cartaporte31:Domicilio Municipio="{self.emisor_municipio}" Estado="{self.emisor_estado}" Pais="MEX" CodigoPostal="{self.emisor_cp}" />
                </cartaporte31:TiposFigura>
            </cartaporte31:FiguraTransporte>
        </cartaporte31:CartaPorte>
    </cfdi:Complemento>
    <cfdi:Addenda>
        <fst3:Contrato xmlns:fst3="http://facturasoftesc.com/ns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://facturasoftesc.com/ns http://facturasoftesc.com/ns/fst3.xsd" Comentario="{d['leyenda_legal']}"></fst3:Contrato>
    </cfdi:Addenda>
</cfdi:Comprobante>""".strip()

    def _generar_pdf_con_diseno(
        self, data, uuid, qr_bytes, s_sat, s_emi, c_sat, cadena_original, importe_letra
    ):
        d = SafeData(data)
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

        context = {
            **d,
            "subtotal": f"{_clean_float(d.get('subtotal', 0)):,.2f}",
            "iva": f"{_clean_float(d.get('iva', 0)):,.2f}",
            "retenciones": f"{_clean_float(d.get('retenciones', 0)):,.2f}",
            "total": f"{_clean_float(d.get('total', 0)):,.2f}",
            "peso_bruto": f"{_clean_float(d.get('peso_bruto', 0)):,.2f}",
            "distancia_total": f"{int(_clean_float(d.get('total_dist_rec', 0))):,}",
            "conceptos": [
                {
                    "clave": "78101802",
                    "cantidad": "1.00",
                    "unidad": "E48 - SRV",
                    "descripcion": d.get("descripcion_concepto", "PAGO"),
                    "detalles_extra": f"Folio: {d['folio']}",
                    "precio": f"{_clean_float(d.get('subtotal', 0)):,.2f}",
                    "importe": f"{_clean_float(d.get('subtotal', 0)):,.2f}",
                }
            ],
            "rfc_emisor": self.emisor_rfc,
            "nombre_emisor": self.emisor_nombre,
            "cp_emisor": self.emisor_cp,
            "regimen_emisor": self.emisor_regimen,
            "uuid": uuid,
            "folio_interno": d["folio"],
            "fecha_emision": d["fecha"],
            "logo_src": logo_src,
            "qr_src": qr_src,
            "metodo_pago": "PPD" if _clean_float(d.get("total", 0)) > 1.50 else "PUE",
            "tipo_comprobante": (
                "I (Ingreso)" if "CartaPorte" in d.get("uso_cfdi", "") else "P (Pago)"
            ),
            "moneda": "MXN",
            "tc": "1",
            "forma_pago": d.get("forma_pago", "99"),
            "condiciones_pago": "Contado",
            "cert_sat": c_sat,
            "cert_emisor": "00001000000504204441",
            "sello_sat": chunk_b64(s_sat),
            "sello_emisor": chunk_b64(s_emi),
            "cadena_original": chunk_b64(cadena_original),
            "importe_letra": importe_letra,
            "id_ccp": d.get("id_ccp", ""),
            "remitente_nombre": self.emisor_nombre,
            "remitente_rfc": self.emisor_rfc,
            "fecha_salida": d["fecha"],
            "domicilio_origen": d.get("domicilio_origen", "N/A"),
            "destinatario_nombre": d["nombre_cliente"],
            "destinatario_rfc": d["rfc_cliente"],
            "fecha_llegada": d["fecha"],
            "domicilio_destino": f"{d.get('municipio_destino', '')}, {d.get('estado_destino', '')}, C.P. {d.get('cp_cliente', '')}",
        }

        env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        html_out = env.get_template("carta_porte.html").render(context)
        pdf_path = self.storage_dir / f"{uuid}.pdf"

        HTML(
            string=html_out, 
            base_url=self.templates_dir.as_uri()
        ).write_pdf(
            str(pdf_path)
        )

    def _guardar_xml_disco(self, xml_bytes: bytes, uuid: str):
        with open(self.storage_dir / f"{uuid}.xml", "wb") as f:
            f.write(xml_bytes)

    def procesar_cancelaciones_pendientes(self):
        logger.info("--- INICIANDO RECUPERADOR DE CANCELACIONES PENDIENTES ---")
        facturas_pendientes = (
            self.db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.status_sat == "PENDIENTE_CANCELAR_SAT")
            .all()
        )
        if not facturas_pendientes:
            return {"mensaje": "Sin pendientes", "procesadas": 0, "resultados": []}
        resultados = []
        for factura in facturas_pendientes:
            try:
                self.cancelar_factura_nominal(
                    invoice_id=factura.id,
                    motivo=factura.motivo_cancelacion or "01",
                    uuid_sustituto=factura.uuid_relacionado or "",
                )
                self.db.refresh(factura)
                resultados.append(
                    {
                        "id": factura.id,
                        "uuid": factura.uuid,
                        "nuevo_status": factura.status_sat,
                    }
                )
            except Exception as e:
                resultados.append(
                    {
                        "id": factura.id,
                        "uuid": factura.uuid,
                        "nuevo_status": f"Error: {str(e)}",
                    }
                )
        return {
            "mensaje": "Proceso completado",
            "procesadas": len(facturas_pendientes),
            "resultados": resultados,
        }