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
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

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

from app.db.database import get_db
from app.modules.logistics.schemas import ReceivableInvoiceCreate
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

logger = logging.getLogger("billing.audit")

DEFAULT_LEYENDA = "Condiciones de prestación de servicios que ampara la CARTA DE PORTE O COMPROBANTE PARA EL TRANSPORTE DE MERCANCÍAS. PRIMERA.- Para los efectos del presente contrato..."

# =========================================================
#  FIX: MAPEO INTELIGENTE DE ESTADOS SAT (INEGI -> 3 LETRAS)
# =========================================================
SAT_ESTADOS_MAP = {
    "01": "AGU",
    "1": "AGU",
    "02": "BCN",
    "2": "BCN",
    "03": "BCS",
    "3": "BCS",
    "04": "CAM",
    "4": "CAM",
    "05": "COA",
    "5": "COA",
    "06": "COL",
    "6": "COL",
    "07": "CHP",
    "7": "CHP",
    "08": "CHH",
    "8": "CHH",
    "09": "CMX",
    "9": "CMX",
    "10": "DUR",
    "11": "GUA",
    "12": "GRO",
    "13": "HID",
    "14": "JAL",
    "15": "MEX",
    "16": "MIC",
    "17": "MOR",
    "18": "NAY",
    "19": "NLE",
    "20": "OAX",
    "21": "PUE",
    "22": "QUE",
    "23": "ROO",
    "24": "SLP",
    "25": "SIN",
    "26": "SON",
    "27": "TAB",
    "28": "TAM",
    "29": "TLA",
    "30": "VER",
    "31": "YUC",
    "32": "ZAC",
    "DIF": "CMX",
    "CDMX": "CMX",
}


def normalizar_estado_sat(estado: str) -> str:
    if not estado:
        return ""
    estado_str = str(estado).strip().upper()

    if len(estado_str) == 3 and estado_str in SAT_ESTADOS_MAP.values():
        resultado = estado_str
    else:
        resultado = SAT_ESTADOS_MAP.get(estado_str, estado_str)

    logger.info(
        f" [DEBUG SAT] Traduciendo Estado: Original='{estado}' -> SAT='{resultado}'"
    )
    return resultado


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


def parse_sat_error(e: Exception) -> str:
    error_msg = str(e).lower()
    if (
        "not found" in error_msg
        or "no such file" in error_msg
        or "cer" in error_msg
        or "key" in error_msg
    ):
        return "_Fallo el timbrado: Actualiza tus sellos (CSD) en configuración. Al parecer no se encuentran, la contraseña es incorrecta o ya no son vigentes."
    return str(e)


# =========================================================
# MAPEO INTELIGENTE DE REMOLQUES SAT (CTR001 - CTR032)
# =========================================================
def get_sat_trailer_code(tipo: str) -> str:
    if not tipo:
        return "CTR004"
    tipo_upper = str(tipo).strip().upper()
    if re.match(r"^CTR0[0-9]{2}$", tipo_upper):
        return tipo_upper
    tipo_lower = tipo_upper.lower()

    if "caballete" in tipo_lower:
        return "CTR001"
    if "abierta" in tipo_lower and "caja" in tipo_lower:
        return "CTR003"
    if "cerrada" in tipo_lower and "caja" in tipo_lower:
        return "CTR004"
    if "recolecci" in tipo_lower or "frontal" in tipo_lower:
        return "CTR005"
    if "refrigerada" in tipo_lower and "caja" in tipo_lower:
        return "CTR006"
    if "seca" in tipo_lower and "caja" in tipo_lower:
        return "CTR007"
    if "transferencia" in tipo_lower:
        return "CTR008"
    if "cama baja" in tipo_lower or "ganso" in tipo_lower:
        return "CTR009"
    if (
        "portacontenedor" in tipo_lower
        or "chasis" in tipo_lower
        or "dolly" in tipo_lower
    ):
        return "CTR010"
    if "especial" in tipo_lower:
        return "CTR012"
    if "estaca" in tipo_lower:
        return "CTR013"
    if "gondola" in tipo_lower or "madrina" in tipo_lower:
        return "CTR014"
    if "grua industrial" in tipo_lower:
        return "CTR015"
    if "grua" in tipo_lower and "plataforma" not in tipo_lower:
        return "CTR016"
    if "integral" in tipo_lower:
        return "CTR017"
    if "jaula" in tipo_lower:
        return "CTR018"
    if "media redila" in tipo_lower:
        return "CTR019"
    if "pallet" in tipo_lower or "celdilla" in tipo_lower:
        return "CTR020"
    if "plataforma" in tipo_lower and "grua" in tipo_lower:
        return "CTR022"
    if "encortinada" in tipo_lower:
        return "CTR023"
    if "plataforma" in tipo_lower:
        return "CTR021"
    if "redila" in tipo_lower:
        return "CTR024"
    if "refrigerador" in tipo_lower:
        return "CTR025"
    if "revolvedora" in tipo_lower:
        return "CTR026"
    if "semicaja" in tipo_lower:
        return "CTR027"
    if "tanque" in tipo_lower or "pipa" in tipo_lower:
        return "CTR028"
    if "tolva" in tipo_lower:
        return "CTR029"
    if "volteo desmontable" in tipo_lower:
        return "CTR032"
    if "volteo" in tipo_lower:
        return "CTR031"
    if "caja" in tipo_lower:
        return "CTR002"
    return "CTR004"


class SafeData(dict):
    def __getitem__(self, key):
        val = self.get(key)
        if val is None or str(val).strip() == "" or str(val).strip() == "None":
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
                if key.lower() in ["rfc_operador", "rfc_cliente"]:
                    return ""
                return "XAXX010101000"
            if "cp" in key.lower():
                return ""
            if key in ["contenedor_1", "contenedor_2"]:
                return "N/A"
            return "NO_ESPECIFICADO"
        return val


class BillingService:
    def __init__(self, db: Session):
        self.db = db
        self.env = os.getenv("ENVIRONMENT", "PROD").upper()
        self.suffix = "_qa" if self.env == "QA" else ""
        logger.info(f"INICIALIZANDO BILLING SERVICE (FACTURACIÓN) EN MODO: {self.env}")

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
        self.emisor_cp = str(cp_conf.value).strip() if cp_conf and cp_conf.value else ""

        loc_emisor = (
            self.db.query(SatLocationCode)
            .filter(SatLocationCode.codigo_postal == self.emisor_cp)
            .first()
        )
        if loc_emisor:
            self.emisor_estado = normalizar_estado_sat(loc_emisor.estado_clave)
            self.emisor_municipio = str(loc_emisor.municipio_clave).zfill(3)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"ERROR INTERNO: El CP de tu empresa (Emisor) '{self.emisor_cp}' está vacío o no existe en tu tabla sat_location_codes.",
            )

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
            cadena_original_tree = transform(xml_doc)
            cadena_original = (
                str(cadena_original_tree)
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
            logger.error(f"Fallo en motor criptográfico blindado: {e}")
            raise HTTPException(status_code=500, detail=f"Error en Sello SAT: {str(e)}")

    def _get_y_avanzar_folio(self, serie: str) -> int:
        from app.models.models import SystemConfig

        config_key = f"folio_actual_{serie}"

        # 1. Buscamos el contador maestro y lo bloqueamos temporalmente para concurrencia
        secuencia = (
            self.db.query(SystemConfig)
            .filter(SystemConfig.key == config_key)
            .with_for_update(of=SystemConfig)  # <--- CON EL FIX APLICADO
            .first()
        )

        if not secuencia:
            # 2. Si no existe, inicializamos el contador
            nuevo_folio = 1
            secuencia = SystemConfig(
                key=config_key, value=str(nuevo_folio), grupo="folios", tipo="integer"
            )
            self.db.add(secuencia)
        else:
            # 3. Si existe, le sumamos 1 y guardamos el nuevo valor
            nuevo_folio = int(secuencia.value) + 1
            secuencia.value = str(nuevo_folio)

        return nuevo_folio

    def _obtener_datos_completos(self, viaje_id: int, usar_tramo_final: bool = False):
        viaje = self.db.query(Trip).filter(Trip.id == viaje_id).first()
        if not viaje:
            raise HTTPException(status_code=404, detail="Viaje no encontrado.")

        cliente = (
            self.db.query(ClientModel).filter(ClientModel.id == viaje.client_id).first()
        )
        if not viaje.legs:
            raise HTTPException(
                status_code=400, detail="El viaje no tiene tramos (TripLeg) asignados."
            )

        tramo_seleccionado = (
            viaje.legs[-1]
            if usar_tramo_final and len(viaje.legs) > 1
            else viaje.legs[0]
        )

        unidad = (
            self.db.query(Unit).filter(Unit.id == tramo_seleccionado.unit_id).first()
        )
        operador = (
            self.db.query(Operator)
            .filter(Operator.id == tramo_seleccionado.operator_id)
            .first()
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
        self,
        viaje,
        cliente,
        unidad,
        operador,
        r1,
        r2,
        is_nominal=False,
        ocultar_montos=False,
        serie_forzada=None,
        folio_forzado=None,
    ) -> dict:
        tarifa = viaje.tariff

        #  FIX: FACTURA SIEMPRE SIN CASETAS. Solo toma la tarifa base pura.
        if tarifa and not is_nominal:
            subtotal = float(tarifa.tarifa_base or 0.0)
            iva_pct = float(tarifa.iva_porcentaje or 16.0) / 100.0
            ret_pct = float(tarifa.retencion_porcentaje or 4.0) / 100.0
            dist_km = int(tarifa.distancia_km or 0)
            distancia_real = str(dist_km) if dist_km > 0 else "1"
        else:
            subtotal = 1.00 if is_nominal else float(viaje.tarifa_base or 0.0)
            iva_pct = 0.16
            ret_pct = 0.04
            distancia_real = "100" if is_nominal else "450"

        iva = subtotal * iva_pct
        retenciones = subtotal * ret_pct
        total = subtotal + iva - retenciones

        nombre_cliente = (
            getattr(cliente, "razon_social", "PUBLICO EN GENERAL")
            if cliente
            else "PUBLICO EN GENERAL"
        )

        #  VALIDACIÓN CRÍTICA SAT CFDI 4.0: CÓDIGO POSTAL CLIENTE
        cp_cliente_fiscal = (
            str(getattr(cliente, "codigo_postal_fiscal", "")).strip() if cliente else ""
        )
        if not cp_cliente_fiscal:
            raise HTTPException(
                status_code=400,
                detail=f"Regla SAT CFDI 4.0: El cliente '{nombre_cliente}' DEBE tener su Código Postal Fiscal.",
            )

        #  VALIDACIÓN CRÍTICA SAT CFDI 4.0: RFC CLIENTE
        rfc_cliente = (
            str(getattr(cliente, "rfc", "")).strip().upper() if cliente else ""
        )
        if not rfc_cliente or rfc_cliente == "XAXX010101000":
            raise HTTPException(
                status_code=400,
                detail=f"Regla SAT CFDI 4.0: El cliente '{nombre_cliente}' DEBE tener un RFC válido. No se permite RFC genérico.",
            )

        subcliente = viaje.sub_client
        cp_destino_fisico = (
            str(getattr(subcliente, "codigo_postal", "")).strip() if subcliente else ""
        )
        if not cp_destino_fisico:
            cp_destino_fisico = cp_cliente_fiscal

        loc_destino = (
            self.db.query(SatLocationCode)
            .filter(SatLocationCode.codigo_postal == cp_destino_fisico)
            .first()
        )
        if loc_destino:
            estado_dest = normalizar_estado_sat(loc_destino.estado_clave)
            municipio_dest = str(loc_destino.municipio_clave).zfill(3)
        else:
            nombre_lugar = (
                getattr(subcliente, "razon_social", nombre_cliente)
                if subcliente
                else nombre_cliente
            )
            raise HTTPException(
                status_code=400,
                detail=f"Error Carta Porte: El código postal de destino '{cp_destino_fisico}' (perteneciente a {nombre_lugar}) NO existe en la BD.",
            )

        tipo_r1_bruto = getattr(r1, "tipo_1", getattr(r1, "tipo", "")) if r1 else ""
        tipo_r2_bruto = getattr(r2, "tipo_1", getattr(r2, "tipo", "")) if r2 else ""

        #  VALIDACIÓN CRÍTICA SAT CP195: OPERADOR
        raw_rfc = getattr(operador, "rfc", "")
        rfc_op_final = (
            re.sub(r"[^A-Z0-9Ñ]", "", raw_rfc.upper().strip()) if raw_rfc else ""
        )
        nombre_op = getattr(operador, "name", "OPERADOR") if operador else "OPERADOR"

        if (
            not rfc_op_final
            or rfc_op_final == "XAXX010101000"
            or len(rfc_op_final) != 13
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Regla SAT CP195: El operador '{nombre_op}' DEBE tener un RFC de Persona Física válido (13 caracteres). Detectado: '{rfc_op_final}'.",
            )

        origen_real = (
            str(viaje.origin or "DOMICILIO CONOCIDO").replace("|", "").strip()[:100]
        )

        raw_destino = (
            getattr(subcliente, "direccion", viaje.destination)
            if subcliente
            else (viaje.destination or "DOMICILIO CONOCIDO")
        )
        calle_destino_real = str(raw_destino).replace("|", "").strip()[:100]

        c1 = getattr(viaje, "contenedor_1", "")
        c2 = getattr(viaje, "contenedor_2", "")
        cont_str = ""
        if c1 and c1 not in ["N/A", "S/R"]:
            cont_str += f" {c1}"
        if c2 and c2 not in ["N/A", "S/R"]:
            cont_str += f" / {c2}"

        clave_servicio_flete = "78101802"
        clave_mercancia = (
            viaje.sat_clave_producto
            if viaje and getattr(viaje, "sat_clave_producto", None)
            else "01010101"
        )
        desc_merc = (
            "FLETE NOMINAL"
            if is_nominal
            else (viaje.descripcion_mercancia or "FLETE CARGA GENERAL")
        )
        pdf_descripcion = f"[{clave_servicio_flete}] Flete carga general {cont_str}"

        dias_credito = getattr(cliente, "dias_credito", 0) if cliente else 0
        condiciones_pago = f"EN {dias_credito} DIAS" if dias_credito > 0 else "CONTADO"

        # 👇 MAGIA DE FOLIOS Y SECUENCIADOR 👇
        serie_final = serie_forzada or "CP"
        folio_final = (
            folio_forzado if folio_forzado else self._get_y_avanzar_folio(serie_final)
        )

        return {
            "id_ccp": "CCC" + str(uuid.uuid4()).upper()[3:],
            "serie": serie_final,
            "folio": str(folio_final),
            "folio_interno": f"{serie_final}-{folio_final}",
            "fecha": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "subtotal": f"{subtotal:.2f}",
            "iva": f"{iva:.2f}",
            "retenciones": f"{retenciones:.2f}",
            "total": f"{total:.2f}",
            "forma_pago": "99",
            "metodo_pago": "PPD",
            "moneda": "MXN",
            "tc": "1",
            "tipo_comprobante": "I",
            "condiciones_pago": condiciones_pago,
            "descripcion_concepto": desc_merc,
            "pdf_descripcion": pdf_descripcion,
            "clave_prod_serv": clave_servicio_flete,
            "rfc_cliente": rfc_cliente,
            "nombre_cliente": nombre_cliente,
            "cp_cliente": cp_cliente_fiscal,
            "cp_destino": cp_destino_fisico,
            "regimen_cliente": (
                getattr(cliente, "regimen_fiscal", "601") if cliente else "601"
            ),
            "uso_cfdi": "G03",
            "total_dist_rec": distancia_real,
            "peso_bruto": (
                str(viaje.peso_toneladas * 1000)
                if viaje and viaje.peso_toneladas
                else "1000.00"
            ),
            "bienes_transp": clave_mercancia,
            "descripcion_mercancia": desc_merc,
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
            "subtipo_remolque": get_sat_trailer_code(tipo_r1_bruto),
            "placa_remolque_1": (
                getattr(r1, "placas", "1XXXX99").replace("-", "") if r1 else "1XXXX99"
            ),
            "subtipo_remolque_2": get_sat_trailer_code(tipo_r2_bruto),
            "placa_remolque_2": (
                getattr(r2, "placas", "1XXXX99").replace("-", "") if r2 else "1XXXX99"
            ),
            "rfc_operador": rfc_op_final,
            "nombre_operador": nombre_op,
            "licencia": (
                getattr(operador, "license_number", "LIC123") if operador else "LIC123"
            ),
            "estado_destino": estado_dest,
            "municipio_destino": municipio_dest,
            "domicilio_origen": origen_real,
            "domicilio_destino": calle_destino_real,
            "leyenda_legal": DEFAULT_LEYENDA,
            "ocultar_montos": ocultar_montos,
            "contenedor_1": getattr(viaje, "contenedor_1", "") or "N/A",
            "contenedor_2": getattr(viaje, "contenedor_2", "") or "N/A",
            "referencia_cliente": getattr(viaje, "referencia", "") or "S/R",
        }

    def _importar_comprobante_ws(self, data, relacion_uuid=None):
        logger.info("Generando XML Factura/Carta Porte (FINANZAS) y enviando al PAC...")
        xml_base = self._armar_xml_sin_sello(data, relacion_uuid)

        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data)
            cert_b64 = base64.b64encode(cer_data).decode("utf-8").replace("\n", "")
            sn_hex = format(cert.serial_number, "x")
            no_certificado = "".join([sn_hex[i] for i in range(1, len(sn_hex), 2)])
            data["cert_emisor"] = no_certificado

        xml_con_cert = xml_base.replace(
            "<cfdi:Comprobante",
            f'<cfdi:Comprobante NoCertificado="{no_certificado}" Certificado="{cert_b64}"',
        )
        sello_b64, cadena_original = self._generar_sello_xslt(
            xml_con_cert.encode("utf-8")
        )
        xml_sellado = xml_con_cert.replace(
            "<cfdi:Comprobante", f'<cfdi:Comprobante Sello="{sello_b64}"'
        )

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
            logger.info(f"¡FACTURA TIMBRADA! UUID: {uuid_timbrado}")

            raw_cfdi = res_sat.cfdiTimbrado
            cfdi_bytes = (
                raw_cfdi.encode("utf-8") if isinstance(raw_cfdi, str) else raw_cfdi
            )

            self._guardar_xml_disco(cfdi_bytes, uuid_timbrado)

            try:
                root = etree.fromstring(cfdi_bytes)
                ns = {
                    "cfdi": "http://www.sat.gob.mx/cfd/4",
                    "tfd": "http://www.sat.gob.mx/TimbreFiscalDigital",
                }
                tfd_node = root.xpath("//tfd:TimbreFiscalDigital", namespaces=ns)[0]
                s_sat = tfd_node.get("SelloSAT", "0000")
                c_sat = tfd_node.get("NoCertificadoSAT", "0000")
                s_emi = root.xpath("//cfdi:Comprobante/@Sello", namespaces=ns)[0]

                cadena_original_tfd = f"||{tfd_node.get('Version', '1.1')}|{uuid_timbrado}|{tfd_node.get('FechaTimbrado')}|{tfd_node.get('RfcProvCertif')}|{tfd_node.get('SelloCFD')}|{c_sat}||"

                total_float = _clean_float(data.get("total", 0))
                if HAS_NUM2WORDS:
                    entero = int(total_float)
                    decimales = int(round((total_float - entero) * 100))
                    texto = num2words(entero, lang="es").upper()
                    if texto == "UNO":
                        texto = "UN"
                    importe_letra = f"({texto} PESO{'S' if entero != 1 else ''} {decimales:02d}/100 MXN)"
                else:
                    importe_letra = f"({total_float:,.2f} MXN)"

                qr_string = f"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id={uuid_timbrado}&re={self.emisor_rfc}&rr={data['rfc_cliente']}&tt={total_float:.2f}&fe={s_emi[-8:]}"
                qr = qrcode.QRCode(version=1, box_size=10, border=2)
                qr.add_data(qr_string)
                qr.make(fit=True)
                buffer = BytesIO()
                qr.make_image(fill_color="black", back_color="white").save(
                    buffer, format="PNG"
                )

                self._generar_pdf_con_diseno(
                    data,
                    uuid_timbrado,
                    buffer.getvalue(),
                    s_sat,
                    s_emi,
                    c_sat,
                    cadena_original_tfd,
                    importe_letra,
                )
            except Exception as e:
                logger.error(f"El XML se timbró pero falló la creación del PDF: {e}")

            class PACResult:
                pass

            ret = PACResult()
            ret.uuid = uuid_timbrado
            return ret

        except Exception as e:
            logger.error(f"Error en comunicación con PAC: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error al timbrar Factura/Carta Porte: {str(e)}",
            )

    def _armar_xml_sin_sello(self, data, relacion_uuid: str = None) -> str:
        d = SafeData(data)

        rfc_op_final = str(d.get("rfc_operador", "")).strip()
        nombre_op = str(d.get("nombre_operador", "Desconocido"))

        if (
            not rfc_op_final
            or rfc_op_final == "XAXX010101000"
            or len(rfc_op_final) != 13
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Regla SAT CP195: El operador '{nombre_op}' DEBE tener un RFC válido de Persona Física (13 caracteres).",
            )

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
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/CartaPorte31 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd" Version="4.0" Fecha="{d['fecha']}" Serie="{d['serie']}" Folio="{d['folio']}"  FormaPago="{d['forma_pago']}" CondicionesDePago="{d['condiciones_pago']}" SubTotal="{d['subtotal']}" Moneda="{d['moneda']}" TipoCambio="{d['tc']}" Total="{d['total']}" TipoDeComprobante="{d['tipo_comprobante']}" Exportacion="01" MetodoPago="{d['metodo_pago']}" LugarExpedicion="{self.emisor_cp}">{relacion_xml}
    <cfdi:Emisor Rfc="{self.emisor_rfc}" Nombre="{self.emisor_nombre}" RegimenFiscal="{self.emisor_regimen}" />
    <cfdi:Receptor Rfc="{d['rfc_cliente']}" Nombre="{d['nombre_cliente']}" DomicilioFiscalReceptor="{d['cp_cliente']}" RegimenFiscalReceptor="{d['regimen_cliente']}" UsoCFDI="{d['uso_cfdi']}" />
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="{d['clave_prod_serv']}" NoIdentificacion="001" Cantidad="1.00" ClaveUnidad="E48" Unidad="SRV" Descripcion="{d['descripcion_concepto']}" ValorUnitario="{d['subtotal']}" Importe="{d['subtotal']}" ObjetoImp="02">
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
                    <cartaporte31:Domicilio Calle="{d['domicilio_destino']}" Municipio="{d['municipio_destino']}" Estado="{d['estado_destino']}" Pais="MEX" CodigoPostal="{d['cp_destino']}" />
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
                <cartaporte31:TiposFigura TipoFigura="01" RFCFigura="{rfc_op_final}" NombreFigura="{d['nombre_operador']}" NumLicencia="{d['licencia']}">
                    <cartaporte31:Domicilio Municipio="{self.emisor_municipio}" Estado="{self.emisor_estado}" Pais="MEX" CodigoPostal="{self.emisor_cp}" />
                </cartaporte31:TiposFigura>
            </cartaporte31:FiguraTransporte>
        </cartaporte31:CartaPorte>
    </cfdi:Complemento>
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

        subtotal_str = f"{_clean_float(d.get('subtotal', 0)):,.2f}"
        iva_str = f"{_clean_float(d.get('iva', 0)):,.2f}"
        retenciones_str = f"{_clean_float(d.get('retenciones', 0)):,.2f}"
        total_str = f"{_clean_float(d.get('total', 0)):,.2f}"

        context = {
            **d,
            "subtotal": subtotal_str,
            "iva": iva_str,
            "retenciones": retenciones_str,
            "total": total_str,
            "peso_bruto": f"{_clean_float(d.get('peso_bruto', 0)):,.2f}",
            "distancia_total": f"{int(_clean_float(d.get('total_dist_rec', 0))):,}",
            "conceptos": [
                {
                    "clave": d.get("clave_prod_serv", "78101802"),
                    "cantidad": "1.00",
                    "unidad": (
                        "ACT"
                        if "Pago" in d.get("descripcion_concepto", "")
                        else "E48 - SRV"
                    ),
                    "descripcion": d.get(
                        "pdf_descripcion", d.get("descripcion_concepto", "PAGO")
                    ),
                    "detalles_extra": f"Folio: {d['folio']}",
                    "precio": subtotal_str,
                    "importe": subtotal_str,
                }
            ],
            "rfc_emisor": self.emisor_rfc,
            "nombre_emisor": self.emisor_nombre,
            "cp_emisor": self.emisor_cp,
            "regimen_emisor": self.emisor_regimen,
            "uuid": uuid,
            "folio_interno": d.get(
                "folio_interno", f"{d.get('serie', 'F')}-{d['folio']}"
            ),
            "fecha_emision": d["fecha"],
            "logo_src": logo_src,
            "qr_src": qr_src,
            "metodo_pago": d.get(
                "metodo_pago",
                "PUE" if _clean_float(d.get("total", 0)) <= 1.50 else "PPD",
            ),
            "tipo_comprobante": "I (Ingreso)",
            "moneda": "MXN",
            "tc": "1",
            "forma_pago": d.get("forma_pago", "99"),
            "condiciones_pago": d.get("condiciones_pago", "CONTADO"),
            "cert_sat": c_sat,
            "cert_emisor": d.get("cert_emisor", "00001000000000000000"),
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
            "domicilio_destino": f"{d.get('municipio_destino', '')}, {d.get('estado_destino', '')}, C.P. {d.get('cp_destino', '')}",
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

    def generar_factura_final_relacionada(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador, r1, r2 = self._obtener_datos_completos(
            invoice_data.viaje_id, usar_tramo_final=True
        )

        #  BLINDAJE: Buscamos la Carta Porte (is_nominal=True) directamente en la BD
        # Esto evita que se pierda si el router o Pydantic no lo envían bien.
        carta_porte = (
            self.db.query(ReceivableInvoice)
            .filter(
                ReceivableInvoice.viaje_id == viaje.id,
                ReceivableInvoice.is_nominal == True,
                ReceivableInvoice.record_status != "E",
            )
            .order_by(ReceivableInvoice.id.desc())
            .first()
        )

        # Obtenemos el UUID de la Carta Porte
        uuid_relacionado_real = (
            carta_porte.uuid
            if carta_porte
            else getattr(invoice_data, "uuid_relacionado", None)
        )

        data = self._build_dict_from_models(
            viaje,
            cliente,
            unidad,
            operador,
            r1,
            r2,
            is_nominal=False,
            ocultar_montos=False,
            folio_forzado=getattr(invoice_data, "folio_forzado", None),
        )

        # Le pasamos el UUID detectado al motor del SAT
        resultado_pac = self._importar_comprobante_ws(
            data, relacion_uuid=uuid_relacionado_real
        )

        monto_total = Decimal(str(_clean_float(data["total"])))

        try:
            # FIX ANTI-DUPLICADOS: Buscamos la provisional y la ACTUALIZAMOS
            factura = (
                self.db.query(ReceivableInvoice)
                .filter(
                    ReceivableInvoice.viaje_id == viaje.id,
                    ReceivableInvoice.is_nominal == False,
                    ReceivableInvoice.record_status != "E",
                )
                .order_by(ReceivableInvoice.id.desc())
                .first()
            )

            from datetime import timedelta

            dias_credito = getattr(cliente, "dias_credito", 0) if cliente else 0
            uuid_generado = getattr(resultado_pac, "uuid", None)

            if factura:
                # Si existe, la reciclamos y le INYECTAMOS TODO
                factura.uuid = uuid_generado
                factura.uuid_relacionado = (
                    uuid_relacionado_real  #  GUARDAMOS EL UUID REAL
                )
                factura.status_sat = "TIMBRADA"
                factura.concepto = data["descripcion_concepto"]
                factura.monto_total = monto_total
                factura.saldo_pendiente = monto_total
                factura.subtotal = Decimal(str(_clean_float(data["subtotal"])))
                factura.iva = Decimal(str(_clean_float(data["iva"])))
                factura.retenciones = Decimal(str(_clean_float(data["retenciones"])))
                factura.fecha_emision = date.today()

                #  INYECCIÓN DE LOS CAMPOS FALTANTES
                factura.sub_client_id = viaje.sub_client_id
                factura.metodo_pago = data.get("metodo_pago", "PPD")
                factura.forma_pago = data.get("forma_pago", "99")
                factura.tipo_comprobante = "I"
                factura.fecha_vencimiento = date.today() + timedelta(days=dias_credito)

                if uuid_generado:
                    factura.pdf_url = f"/api/sat/invoice/{uuid_generado}/pdf"
                    factura.xml_url = f"/api/sat/invoice/{uuid_generado}/xml"
            else:
                # Fallback por si algo falló y no existe provisional
                factura = ReceivableInvoice(
                    client_id=viaje.client_id,
                    folio_interno=data.get("folio_interno"),
                    sub_client_id=viaje.sub_client_id,
                    viaje_id=viaje.id,
                    uuid=uuid_generado,
                    uuid_relacionado=uuid_relacionado_real,
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
                    fecha_vencimiento=date.today() + timedelta(days=dias_credito),
                    metodo_pago=data.get("metodo_pago", "PPD"),
                    forma_pago=data.get("forma_pago", "99"),
                    tipo_comprobante="I",
                    pdf_url=(
                        f"/api/sat/invoice/{uuid_generado}/pdf"
                        if uuid_generado
                        else None
                    ),
                    xml_url=(
                        f"/api/sat/invoice/{uuid_generado}/xml"
                        if uuid_generado
                        else None
                    ),
                )

            self.db.add(factura)

            if factura.uuid:
                viaje.uuid_fiscal = factura.uuid
                viaje.estatus = "facturado"
                self.db.add(viaje)

            self.db.commit()
            self.db.refresh(factura)
            return factura

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error guardando factura final: {str(e)}")
            raise HTTPException(
                status_code=500, detail="Error al guardar factura final en BD."
            )

    def generar_carta_porte_one_shot(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador, r1, r2 = self._obtener_datos_completos(
            invoice_data.viaje_id, usar_tramo_final=True
        )
        data = self._build_dict_from_models(
            viaje,
            cliente,
            unidad,
            operador,
            r1,
            r2,
            is_nominal=False,
            ocultar_montos=False,
        )
        resultado_pac = self._importar_comprobante_ws(data, relacion_uuid=None)

        monto_total = Decimal(str(_clean_float(data["total"])))

        try:
            factura = (
                self.db.query(ReceivableInvoice)
                .filter(
                    ReceivableInvoice.viaje_id == viaje.id,
                    ReceivableInvoice.is_nominal == False,
                    ReceivableInvoice.record_status != "E",
                )
                .order_by(ReceivableInvoice.id.desc())
                .first()
            )

            from datetime import timedelta

            dias_credito = getattr(cliente, "dias_credito", 0) if cliente else 0
            uuid_generado = getattr(resultado_pac, "uuid", None)

            if factura:
                factura.uuid = uuid_generado
                factura.status_sat = "TIMBRADA"
                factura.concepto = data["descripcion_concepto"]
                factura.monto_total = monto_total
                factura.saldo_pendiente = monto_total
                factura.subtotal = Decimal(str(_clean_float(data["subtotal"])))
                factura.iva = Decimal(str(_clean_float(data["iva"])))
                factura.retenciones = Decimal(str(_clean_float(data["retenciones"])))
                factura.fecha_emision = date.today()

                #  INYECCIÓN DE LOS CAMPOS FALTANTES
                factura.sub_client_id = viaje.sub_client_id
                factura.metodo_pago = data.get("metodo_pago", "PPD")
                factura.forma_pago = data.get("forma_pago", "99")
                factura.tipo_comprobante = "I"
                factura.fecha_vencimiento = date.today() + timedelta(days=dias_credito)

                if uuid_generado:
                    factura.pdf_url = f"/api/sat/invoice/{uuid_generado}/pdf"
                    factura.xml_url = f"/api/sat/invoice/{uuid_generado}/xml"
            else:
                factura = ReceivableInvoice(
                    client_id=viaje.client_id,
                    sub_client_id=viaje.sub_client_id,  #  INYECTADO
                    folio_interno=data.get("folio_interno"),
                    viaje_id=viaje.id,
                    uuid=uuid_generado,
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
                    fecha_vencimiento=date.today()
                    + timedelta(days=dias_credito),  #  INYECTADO
                    #  INYECCIÓN DE LOS CAMPOS FALTANTES
                    metodo_pago=data.get("metodo_pago", "PPD"),
                    forma_pago=data.get("forma_pago", "99"),
                    tipo_comprobante="I",
                    pdf_url=(
                        f"/api/sat/invoice/{uuid_generado}/pdf"
                        if uuid_generado
                        else None
                    ),
                    xml_url=(
                        f"/api/sat/invoice/{uuid_generado}/xml"
                        if uuid_generado
                        else None
                    ),
                )

            self.db.add(factura)

            if factura.uuid:
                viaje.uuid_fiscal = factura.uuid
                viaje.estatus = "facturado"
                self.db.add(viaje)

            self.db.commit()
            self.db.refresh(factura)
            return factura

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error guardando factura One-Shot: {str(e)}")
            raise HTTPException(
                status_code=500, detail="Error al guardar factura One-Shot en BD."
            )

    def cancelar_factura_nominal(
        self, invoice_id: int, motivo: str = "01", uuid_sustituto: str = None
    ):
        factura = (
            self.db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.id == invoice_id)
            .first()
        )
        if not factura or not factura.uuid:
            raise ValueError("Factura no encontrada o sin UUID.")

        logger.info(
            f"Iniciando cancelación en SAT del UUID: {factura.uuid} con Motivo: {motivo}"
        )

        try:
            client_zeep = zeep.Client(self.wsdl_timbrado, plugins=[self.history])

            factura.status_sat = "CANCELADO"
            self.db.add(factura)
            self.db.commit()
            logger.info(f"UUID {factura.uuid} cancelado exitosamente en el sistema.")

        except Exception as e:
            logger.error(f"Error al cancelar UUID {factura.uuid}: {e}")
            factura.status_sat = "PENDIENTE_CANCELAR_SAT"
            factura.motivo_cancelacion = motivo
            self.db.add(factura)
            self.db.commit()
            raise HTTPException(
                status_code=500,
                detail=f"Fallo comunicación con el SAT para cancelar: {e}",
            )

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

    def generar_factura_libre(self, d: dict):
        """Genera y timbra una factura de Ingreso Pura (Sin Carta Porte)"""
        from datetime import date
        from decimal import Decimal
        import base64
        import zeep
        from cryptography import x509

        # 1. Variables básicas y Secuenciador
        folio_real = self._get_y_avanzar_folio("F")
        folio_int = f"F-{folio_real}"
        fecha = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

        # 2. Armar XML limpio (Sin complementos)
        xml_base = self._armar_xml_ingreso_libre(d, str(folio_real), fecha)

        # 👇 NUEVO: Guardamos el folio real en el diccionario para usarlo al guardar en BD
        d["folio_interno"] = folio_int

        # 3. Sellar el XML
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
        sello_b64, _ = self._generar_sello_xslt(xml_con_cert.encode("utf-8"))
        xml_sellado = xml_con_cert.replace(
            "<cfdi:Comprobante", f'<cfdi:Comprobante Sello="{sello_b64}"'
        )

        # 4. Enviar a Timbrar al PAC
        try:
            client_zeep = zeep.Client(self.wsdl_timbrado, plugins=[self.history])
            result = client_zeep.service.timbrar(
                self.pac_user, self.pac_pass, xml_sellado.encode("utf-8"), False
            )

            if int(getattr(result, "status", 0)) != 200:
                raise ValueError(f"Error PAC: {result.mensaje}")

            res_sat = result.resultados[0]
            if int(getattr(res_sat, "status", 0)) != 200:
                raise ValueError(f"Error SAT: {res_sat.mensaje}")

            uuid_timbrado = res_sat.uuid
            raw_cfdi = res_sat.cfdiTimbrado
            cfdi_bytes = (
                raw_cfdi.encode("utf-8") if isinstance(raw_cfdi, str) else raw_cfdi
            )

            # Guardar XML
            self._guardar_xml_disco(cfdi_bytes, uuid_timbrado)

            # 5. Guardar en Base de Datos como "Factura Libre"
            from app.models.models import ReceivableInvoice

            factura = ReceivableInvoice(
                client_id=d.get("client_id"),
                viaje_id=None,  # ES FACTURA LIBRE
                folio_interno=data.get("folio_interno"),
                uuid=uuid_timbrado,
                is_nominal=False,
                status_sat="TIMBRADA",
                estatus="pendiente",
                concepto=(
                    d["conceptos"][0]["descripcion"]
                    if d.get("conceptos")
                    else "Factura Libre"
                ),
                monto_total=Decimal(str(d.get("monto_total", 0))),
                saldo_pendiente=Decimal(str(d.get("monto_total", 0))),
                subtotal=Decimal(str(d.get("subtotal", 0))),
                iva=Decimal(str(d.get("iva", 0))),
                retenciones=Decimal(str(d.get("retenciones", 0))),
                moneda=d.get("moneda", "MXN"),
                fecha_emision=date.today(),
                fecha_vencimiento=date.today(),
                metodo_pago=d.get("metodo_pago", "PUE"),
                forma_pago=d.get("forma_pago", "99"),
                tipo_comprobante="I",
                pdf_url=f"/api/sat/invoice/{uuid_timbrado}/pdf",
                xml_url=f"/api/sat/invoice/{uuid_timbrado}/xml",
            )
            self.db.add(factura)
            self.db.commit()
            self.db.refresh(factura)
            return factura

        except Exception as e:
            logger.error(f"Fallo en factura libre: {e}")
            self.db.rollback()
            raise

    def _armar_xml_ingreso_libre(self, d: dict, folio: str, fecha: str) -> str:
        conceptos_xml = ""
        # Iteramos los conceptos que llegaron del Frontend
        for c in d.get("conceptos", []):
            # Calcula IVA del renglón (Asumimos 16%)
            iva_renglon = float(c["importe"]) * 0.16
            impuestos_xml = f'<cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="{c["importe"]}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="{iva_renglon:.2f}" /></cfdi:Traslados>'

            # Si hay retención global, se la aplicamos proporcionalmente al renglón
            if float(d.get("retenciones", 0)) > 0:
                ret_renglon = float(c["importe"]) * 0.04
                impuestos_xml += f'<cfdi:Retenciones><cfdi:Retencion Base="{c["importe"]}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.040000" Importe="{ret_renglon:.2f}" /></cfdi:Retenciones>'

            impuestos_xml += "</cfdi:Impuestos>"
            conceptos_xml += f'<cfdi:Concepto ClaveProdServ="{c["claveProdServ"]}" NoIdentificacion="{c.get("id", "01")}" Cantidad="{c["cantidad"]}" ClaveUnidad="{c["claveUnidad"]}" Unidad="UNIDAD" Descripcion="{c["descripcion"]}" ValorUnitario="{c["precioUnitario"]}" Importe="{c["importe"]}" ObjetoImp="02">{impuestos_xml}</cfdi:Concepto>'

        # Bloque de Impuestos Globales
        imp_global = f'<cfdi:Impuestos TotalImpuestosRetenidos="{d.get("retenciones", "0.00")}" TotalImpuestosTrasladados="{d.get("iva", "0.00")}"><cfdi:Retenciones><cfdi:Retencion Impuesto="002" Importe="{d.get("retenciones", "0.00")}" /></cfdi:Retenciones><cfdi:Traslados><cfdi:Traslado Base="{d["subtotal"]}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="{d["iva"]}" /></cfdi:Traslados></cfdi:Impuestos>'
        if (
            float(d.get("retenciones", 0)) == 0
        ):  # Si no hay retención, el SAT prohíbe poner el nodo
            imp_global = f'<cfdi:Impuestos TotalImpuestosTrasladados="{d.get("iva", "0.00")}"><cfdi:Traslados><cfdi:Traslado Base="{d["subtotal"]}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="{d["iva"]}" /></cfdi:Traslados></cfdi:Impuestos>'

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Fecha="{fecha}" Serie="F" Folio="{folio}" FormaPago="{d.get('forma_pago', '99')}" CondicionesDePago="Contado" SubTotal="{d['subtotal']}" Moneda="{d.get('moneda', 'MXN')}" TipoCambio="1" Total="{d['monto_total']}" TipoDeComprobante="I" Exportacion="01" MetodoPago="{d.get('metodo_pago', 'PPD')}" LugarExpedicion="{self.emisor_cp}">
    <cfdi:Emisor Rfc="{self.emisor_rfc}" Nombre="{self.emisor_nombre}" RegimenFiscal="{self.emisor_regimen}" />
    <cfdi:Receptor Rfc="{d['cliente_rfc']}" Nombre="{d['cliente']}" DomicilioFiscalReceptor="{d['cp_receptor']}" RegimenFiscalReceptor="{d['regimen_fiscal_receptor']}" UsoCFDI="{d['uso_cfdi']}" />
    <cfdi:Conceptos>{conceptos_xml}</cfdi:Conceptos>{imp_global}
</cfdi:Comprobante>""".strip()
