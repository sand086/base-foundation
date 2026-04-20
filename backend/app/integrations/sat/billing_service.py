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
# HELPER: LIMPIEZA SEGURA DE FLOTANTES Y DECIMALES
# =========================================================================
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
            else "TRANSPORTES RAPIDOS 3T"
        )
        raw_emisor = (
            raw_emisor.upper()
            .replace(" S.A. DE C.V.", "")
            .replace(" SA DE CV", "")
            .strip()
        )

        self.emisor_nombre = (
            "TRANSPORTES RAPIDOS 3T"
            if self.emisor_rfc == "EKU9003173C9"
            else raw_emisor
        )
        self.emisor_regimen = (
            regimen_conf.value if regimen_conf and regimen_conf.value else "624"
        )
        self.emisor_cp = cp_conf.value if cp_conf and cp_conf.value else "91808"

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

    # =====================================================================
    # MOTOR CRIPTOGRÁFICO DE SELLADO (NUEVO)
    # =====================================================================
    def _generar_sello_xslt(self, xml_bytes: bytes) -> tuple[str, str]:
        """Aplica el XSLT oficial al XML para obtener la Cadena Original y la firma."""
        # 1. Buscamos el archivo XSLT local que descargaste
        xslt_local_path = (
            self.base_path
            / "app"
            / "integrations"
            / "sat"
            / "cadenas_sat_originales_base"
            / "cadenaoriginal_4_0.xslt.xml"
        )

        try:
            if xslt_local_path.exists():
                xslt_doc = etree.parse(str(xslt_local_path))
            else:
                logger.warning("No se encontró el XSLT local. Conectando al SAT...")
                xslt_doc = etree.parse(
                    "http://www.sat.gob.mx/sitio_internet/cfd/4/cadenaoriginal_4_0/cadenaoriginal_4_0.xslt"
                )

            # 2. Transformar XML -> Cadena Original
            transform = etree.XSLT(xslt_doc)
            xml_doc = etree.fromstring(xml_bytes)

            cadena_original_tree = transform(xml_doc)
            cadena_original = str(cadena_original_tree)

            # Limpiamos basurilla del formato
            cadena_original = (
                cadena_original.replace('<?xml version="1.0" encoding="UTF-8"?>', "")
                .replace("\n", "")
                .strip()
            )

            # 3. Leer la llave privada
            with open(self.path_key, "rb") as f:
                private_key = load_der_private_key(
                    f.read(), password=self.key_password.encode()
                )

            # 4. Encriptar (SHA256) y firmar
            signature = private_key.sign(
                cadena_original.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256()
            )
            sello_b64 = base64.b64encode(signature).decode("utf-8")

            return sello_b64, cadena_original
        except Exception as e:
            logger.error(f"Fallo en motor criptográfico (XSLT/Sello): {e}")
            raise HTTPException(
                status_code=500, detail=f"Error generando el Sello SAT: {str(e)}"
            )

    # =====================================================================
    # MÉTODOS AUXILIARES
    # =====================================================================

    def _obtener_datos_completos(self, viaje_id: int, is_final: bool = False):
        viaje = self.db.query(Trip).filter(Trip.id == viaje_id).first()
        if not viaje:
            raise HTTPException(status_code=404, detail="Viaje no encontrado.")

        cliente = (
            self.db.query(ClientModel).filter(ClientModel.id == viaje.client_id).first()
        )

        tramo = self.db.query(TripLeg).filter(TripLeg.trip_id == viaje_id).first()
        if not tramo:
            raise HTTPException(
                status_code=400, detail="El viaje no tiene tramos (TripLeg) asignados."
            )

        unidad = self.db.query(Unit).filter(Unit.id == tramo.unit_id).first()
        operador = (
            self.db.query(Operator).filter(Operator.id == tramo.operator_id).first()
        )

        r1 = (
            self.db.query(Unit).filter(Unit.id == viaje.remolque_1_id).first()
            if viaje.remolque_1_id
            else None
        )
        r2 = (
            self.db.query(Unit).filter(Unit.id == viaje.remolque_2_id).first()
            if viaje.remolque_2_id
            else None
        )

        return viaje, cliente, unidad, operador, r1, r2

    def _build_dict_from_models(
        self, viaje, cliente, unidad, operador, r1, r2, is_nominal=False
    ) -> dict:
        subtotal = 1.00 if is_nominal else float(viaje.tarifa_base or 0.0)
        iva = subtotal * 0.16
        retenciones = subtotal * 0.04
        total = subtotal + iva - retenciones

        cp_cliente = (
            getattr(cliente, "codigo_postal_fiscal", "91808") if cliente else "91808"
        )

        loc_destino = (
            self.db.query(SatLocationCode)
            .filter(SatLocationCode.codigo_postal == cp_cliente)
            .first()
        )

        if loc_destino:
            estado_dest = loc_destino.estado_clave
            municipio_dest = str(loc_destino.municipio_clave).zfill(3)
        else:
            logger.warning(
                f"CP {cp_cliente} no encontrado en BD. Usando tríada fallback Veracruz."
            )
            cp_cliente = "91808"
            estado_dest = "VER"
            municipio_dest = "193"

        return {
            "id_ccp": "CCC" + str(uuid.uuid4()).upper().replace("-", "")[:33],
            "folio": f"CP-{viaje.id}{'N' if is_nominal else 'F'}",
            "fecha": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "subtotal": f"{subtotal:.2f}",
            "iva": f"{iva:.2f}",
            "retenciones": f"{retenciones:.2f}",
            "total": f"{total:.2f}",
            "descripcion_concepto": (
                "FLETE NOMINAL"
                if is_nominal
                else (viaje.descripcion_mercancia or "FLETE CARGA GENERAL")
            ),
            "rfc_cliente": cliente.rfc if cliente else "XAXX010101000",
            "nombre_cliente": cliente.razon_social if cliente else "PUBLICO EN GENERAL",
            "cp_cliente": cp_cliente,
            "regimen_cliente": (
                getattr(cliente, "regimen_fiscal", "601") if cliente else "601"
            ),
            "uso_cfdi": "G03",
            "total_dist_rec": "100",
            "peso_bruto": (
                str(viaje.peso_toneladas * 1000)
                if viaje and viaje.peso_toneladas
                else "1000.00"
            ),
            "bienes_transp": (
                "01010101"
                if (
                    is_nominal
                    or not viaje
                    or not getattr(viaje, "sat_clave_producto", None)
                    or getattr(viaje, "sat_clave_producto", None) == "78101802"
                )
                else viaje.sat_clave_producto
            ),
            "descripcion_mercancia": (
                viaje.descripcion_mercancia
                if viaje and viaje.descripcion_mercancia
                else "Carga General"
            ),
            "permiso_sct": (
                getattr(unidad, "permiso_sct_tipo", "TPAF01") if unidad else "TPAF01"
            ),
            "num_permiso": (
                getattr(unidad, "permiso_sct_folio", "123456") if unidad else "123456"
            ),
            "config_vehicular": (
                getattr(unidad, "config_vehicular_sat", "T3S2") if unidad else "T3S2"
            ),
            "peso_bruto_vehicular": "15000",
            "placas": (
                getattr(unidad, "placas", "XXXXXX").replace("-", "")
                if unidad
                else "XXXXXX"
            ),
            "anio_modelo": str(getattr(unidad, "year", "2020")) if unidad else "2020",
            "aseguradora": (
                getattr(unidad, "aseguradora_resp_civil", "SEGUROS")
                if unidad
                else "SEGUROS"
            ),
            "poliza": (
                getattr(unidad, "poliza_resp_civil", "123456") if unidad else "123456"
            ),
            "subtipo_remolque": getattr(r1, "tipo_1", "CTR004") if r1 else "CTR004",
            "placa_remolque_1": (
                getattr(r1, "placas", "1XXXX99").replace("-", "") if r1 else "1XXXX99"
            ),
            "subtipo_remolque_2": getattr(r2, "tipo_1", "CTR004") if r2 else "CTR004",
            "placa_remolque_2": (
                getattr(r2, "placas", "1XXXX99").replace("-", "") if r2 else "1XXXX99"
            ),
            "rfc_operador": (
                getattr(operador, "rfc", "XAXX010101000")
                if operador
                else "XAXX010101000"
            ),
            "nombre_operador": (
                getattr(operador, "name", "OPERADOR") if operador else "OPERADOR"
            ),
            "licencia": (
                getattr(operador, "license_number", "LIC123") if operador else "LIC123"
            ),
            "cp_destino": cp_cliente,
            "estado_destino": estado_dest,
            "municipio_destino": municipio_dest,
            "leyenda_legal": DEFAULT_LEYENDA,
        }

    def _importar_comprobante_ws(self, data, relacion_uuid=None):
        logger.info("Generando XML Carta Porte y enviando al PAC...")

        # 1. Armar XML Base
        xml_base = self._armar_xml_sin_sello(data, relacion_uuid)

        # 2. Inyectar Certificado
        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data)
            cert_b64 = base64.b64encode(cer_data).decode("utf-8").replace("\n", "")
            sn_hex = format(cert.serial_number, "x")
            no_certificado = "".join([sn_hex[i] for i in range(1, len(sn_hex), 2)])

        xml_con_cert = xml_base.replace(
            "<cfdi:Comprobante",
            f'<cfdi:Comprobante NoCertificado="{no_certificado}" Certificado="{cert_b64}"',
        )

        # 3. 🛡️ FIRMAR EL XML OFICIALMENTE CON XSLT 🛡️
        sello_b64, cadena_original = self._generar_sello_xslt(
            xml_con_cert.encode("utf-8")
        )

        xml_sellado = xml_con_cert.replace(
            "<cfdi:Comprobante", f'<cfdi:Comprobante Sello="{sello_b64}"'
        )

        # 4. Enviar al PAC
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

            uuid_timbrado = res_sat.uuid
            logger.info(f"¡CARTA PORTE TIMBRADA! UUID: {uuid_timbrado}")

            raw_cfdi = res_sat.cfdiTimbrado
            cfdi_bytes = (
                raw_cfdi.encode("utf-8") if isinstance(raw_cfdi, str) else raw_cfdi
            )
            self._guardar_xml_disco(cfdi_bytes, uuid_timbrado)

            class PACResult:
                pass

            ret = PACResult()
            ret.uuid = uuid_timbrado
            return ret

        except Exception as e:
            logger.error(f"Error en comunicación con PAC: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error al timbrar Carta Porte: {str(e)}"
            )

    # =====================================================================
    # MÉTODOS DE FACTURACIÓN
    # =====================================================================

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
        logger.info(f"--- INICIANDO TIMBRADO DE COMPLEMENTO DE PAGO (PAGOS 2.0) ---")

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
                    status_code=400,
                    detail=f"Factura ID {invoice_id} inválida o sin timbrar.",
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

            total_retenciones_iva += ret_dr.quantize(Decimal("0.00"))
            total_traslados_base_iva16 += base_dr.quantize(Decimal("0.00"))
            total_traslados_impuesto_iva16 += iva_dr.quantize(Decimal("0.00"))
            total_recibido += monto_abono

            folio_split = str(factura.folio_interno).split("-")
            serie_dr = folio_split[0] if len(folio_split) > 1 else ""
            folio_dr = folio_split[-1]

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
                }
            )

            factura.saldo_pendiente = float(saldo_anterior - monto_abono)
            if factura.saldo_pendiente <= 0.01:
                factura.saldo_pendiente = 0.0
                factura.estatus = "pagado"
            else:
                factura.estatus = "pago_parcial"

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
            .replace(" SA DE CV", "")
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
            "total_retenciones_iva": f"{total_retenciones_iva:.2f}",
            "total_traslados_base_iva16": f"{total_traslados_base_iva16:.2f}",
            "total_traslados_impuesto_iva16": f"{total_traslados_impuesto_iva16:.2f}",
        }

        # 1. Armar XML de pago sin sello
        xml_base = self._armar_xml_pago_sin_sello(datos_pago)

        # 2. 🛡️ FIRMAR EL XML OFICIALMENTE CON XSLT 🛡️
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
                    status_code=500, detail="El PAC no devolvió resultados en el REP."
                )

            res_sat = result.resultados[0]
            if int(getattr(res_sat, "status", 0)) != 200:
                raise HTTPException(
                    status_code=400, detail=f"Error SAT: {res_sat.mensaje}"
                )

            complemento_uuid = res_sat.uuid
            logger.info(f"¡REP TIMBRADO EXITOSAMENTE! UUID: {complemento_uuid}")

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
            tfd_node = root.xpath("//tfd:TimbreFiscalDigital", namespaces=ns)[0]
            s_sat = tfd_node.get("SelloSAT", "0000")
            c_sat = tfd_node.get("NoCertificadoSAT", "0000")
            s_emi = root.xpath("//cfdi:Comprobante/@Sello", namespaces=ns)[0]

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
            impuestos_dr_xml = ""
            retenciones_xml = ""
            traslados_xml = ""

            if doc["tiene_retencion"]:
                retenciones_xml = f'<pago20:RetencionesDR><pago20:RetencionDR BaseDR="{doc["base_dr"]}" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.040000" ImporteDR="{doc["ret_dr"]}"/></pago20:RetencionesDR>'
            if doc["tiene_iva"]:
                traslados_xml = f'<pago20:TrasladosDR><pago20:TrasladoDR BaseDR="{doc["base_dr"]}" ImpuestoDR="002" TipoFactorDR="Tasa" TasaOCuotaDR="0.160000" ImporteDR="{doc["iva_dr"]}"/></pago20:TrasladosDR>'

            if doc["tiene_retencion"] or doc["tiene_iva"]:
                impuestos_dr_xml = f"<pago20:ImpuestosDR>{retenciones_xml}{traslados_xml}</pago20:ImpuestosDR>"

            serie_str = f' Serie="{doc["serie"]}"' if doc.get("serie") else ""
            doctos_xml += f"""
                <pago20:DoctoRelacionado IdDocumento="{doc['uuid']}"{serie_str} Folio="{doc['folio']}" MonedaDR="{doc['moneda']}" EquivalenciaDR="1" NumParcialidad="1" ImpSaldoAnt="{doc['saldo_anterior']}" ImpPagado="{doc['monto_pagado']}" ImpSaldoInsoluto="{doc['saldo_insoluto']}" ObjetoImpDR="02">{impuestos_dr_xml}</pago20:DoctoRelacionado>"""

        totales_xml = f"<pago20:Totales "
        if float(d["total_retenciones_iva"]) > 0:
            totales_xml += f'TotalRetencionesIVA="{d["total_retenciones_iva"]}" '
        if float(d["total_traslados_base_iva16"]) > 0:
            totales_xml += f'TotalTrasladosBaseIVA16="{d["total_traslados_base_iva16"]}" TotalTrasladosImpuestoIVA16="{d["total_traslados_impuesto_iva16"]}" '
        totales_xml += f'MontoTotalPagos="{d["monto_total"]}"/>'

        impuestos_p_xml = ""
        retenciones_p_xml = ""
        traslados_p_xml = ""

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
        # 1. Inyectar Certificado primero
        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data)
            cert_b64 = base64.b64encode(cer_data).decode("utf-8").replace("\n", "")
            sn_hex = format(cert.serial_number, "x")
            no_certificado = "".join([sn_hex[i] for i in range(1, len(sn_hex), 2)])

        xml_con_cert = xml_str.replace(
            "<cfdi:Comprobante",
            f'<cfdi:Comprobante NoCertificado="{no_certificado}" Certificado="{cert_b64}"',
        )

        # 2. 🛡️ Generar Sello con XSLT 🛡️
        sello_b64, _ = self._generar_sello_xslt(xml_con_cert.encode("utf-8"))

        xml_sellado = xml_con_cert.replace(
            "<cfdi:Comprobante", f'<cfdi:Comprobante Sello="{sello_b64}"'
        )
        return xml_sellado

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

        mat_peligroso = (
            ' MaterialPeligroso="No"' if d["bienes_transp"] == "01010101" else ""
        )

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
                <cartaporte31:Mercancia BienesTransp="{d['bienes_transp']}" Descripcion="{d['descripcion_mercancia']}" Cantidad="1" ClaveUnidad="H87" PesoEnKg="{d['peso_bruto']}" Unidad="pza"{mat_peligroso} />
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
                    "clave": (
                        "84111506"
                        if "Pago" in d.get("descripcion_concepto", "")
                        else "78101802"
                    ),
                    "cantidad": "1.00",
                    "unidad": (
                        "ACT"
                        if "Pago" in d.get("descripcion_concepto", "")
                        else "E48 - SRV"
                    ),
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
            "metodo_pago": d.get(
                "metodo_pago",
                "PUE" if _clean_float(d.get("total", 0)) <= 1.50 else "PPD",
            ),
            "tipo_comprobante": (
                "P (Pago)"
                if "PAGO" in d.get("descripcion_concepto", "").upper()
                else "I (Ingreso)"
            ),
            "moneda": (
                "MXN"
                if "PAGO" not in d.get("descripcion_concepto", "").upper()
                else "XXX"
            ),
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
            "fecha_salida": d.get("fecha", ""),
            "domicilio_origen": d.get("domicilio_origen", "N/A"),
            "destinatario_nombre": d.get("nombre_cliente", ""),
            "destinatario_rfc": d.get("rfc_cliente", ""),
            "fecha_llegada": d.get("fecha", ""),
            "domicilio_destino": f"{d.get('municipio_destino', '')}, {d.get('estado_destino', '')}, C.P. {d.get('cp_cliente', '')}",
            "fecha_pago": d.get("fecha_pago", ""),
            "monto_total_pago": f"{_clean_float(d.get('monto_total', 0)):,.2f}",
            "doctos_relacionados": d.get("doctos_relacionados", []),
        }

        env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        html_out = env.get_template("carta_porte.html").render(context)
        pdf_path = self.storage_dir / f"{uuid}.pdf"

        HTML(string=html_out, base_url=self.templates_dir.as_uri()).write_pdf(
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
