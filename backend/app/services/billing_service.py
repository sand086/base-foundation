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
    SystemConfig,
    SatLocationCode,
)
from app.schemas.trips import ReceivableInvoiceCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("billing.audit")

# =======================================================
# LEYENDA LEGAL POR DEFECTO (Extraída del OCR de Karcher/Rapid-3T)
# =======================================================
DEFAULT_LEYENDA = "Condiciones de prestación de servicios que ampara la CARTA DE PORTE O COMPROBANTE PARA EL TRANSPORTE DE MERCANCÍAS. PRIMERA.- Para los efectos del presente contrato de transporte se denomina 'Transportista' al que realiza el servicio de transportación y 'Remitente' o 'Expedidor' al usuario que contrate el servicio o remite la mercancía. SEGUNDA.- El 'Remitente' o 'Expedidor' es responsable de que la información proporcionada al 'Transportista' sea veraz y que la documentación que entregue para efectos del transporte sea la correcta. TERCERA.- El 'Remitente' o 'Expedidor' debe declarar al 'Transportista' el tipo de mercancía o efectos de que se trate, peso, medidas y/o número de la carga que entrega para su transporte y, en su caso, el valor de la misma. La carga que se entregue a granel será pesada por el 'Transportista' en el primer punto donde haya báscula apropiada o, en su defecto, aforada en metros cúbicos con la conformidad del 'Remitente' o 'Expedidor'. CUARTA.- Para efectos del transporte, el 'Remitente' o 'Expedidor' deberá entregar al 'Transportista' los documentos que las leyes y reglamentos exijan para llevar a cabo el servicio, en caso de no cumplirse con estos requisitos el 'Transportista' está obligado a rehusar el transporte de las mercancías. QUINTA.- Si por sospecha de falsedad en la declaración del contenido de un bulto el 'Transportista' deseare proceder a su reconocimiento, podrá hacerlo ante testigos y con asistencia del 'Remitente' o 'Expedidor' o del consignatario. Si este último no concurriere, se solicitará la presencia de un inspector de la Secretaría de Comunicaciones y Transportes, y se levantará el acta correspondiente. El 'Transportista' tendrá en todo caso, la obligación de dejar los bultos en el estado en que se encontraban antes del reconocimiento. SEXTA.- El 'Transportista' deberá recoger y entregar la carga precisamente en los domicilios que señale el 'Remitente' o 'Expedidor' ajustándose a los términos y condiciones convenidos. El 'Transportista' sólo está obligado a llevar la carga al domicilio del consignatario para su entrega una sola vez. Si ésta no fuera recibida se dejará aviso de que la mercancía queda a disposición del interesado en las bodegas que indique el 'Transportista'. SÉPTIMA.- Si la carga no fuere retirada dentro de los 30 días hábiles siguientes a aquél en que hubiere sido puesta a disposición del consignatario, el 'Transportista' podrá solicitar la venta en subasta pública con arreglo a lo que dispone el Código de Comercio. OCTAVA.- El 'Transportista' y el 'Remitente' o 'Expedidor' negociarán libremente el precio del servicio, tomando en cuenta su tipo, característica de los embarques, volumen, regularidad, clase de carga y sistema de pago. NOVENA.- Si el 'Remitente' o 'Expedidor' desea que el 'Transportista' asuma la responsabilidad por el valor de las mercancías o efectos que él declare y que cubra toda clase de riesgos, inclusive los derivados de caso fortuito o de fuerza mayor, las partes deberán convenir un cargo adicional, equivalente al valor de la prima del seguro que se contrate, el cual se deberá expresar en la Carta de Porte. DÉCIMA.- Cuando el importe del flete no incluya el cargo adicional, la responsabilidad del 'Transportista' queda expresamente limitada a la cantidad equivalente a 15 días del salario mínimo vigente en el Distrito Federal por tonelada o cuando se trate de embarques cuyo peso sea mayor de 200 kg., pero menor de 1000 kg; y a 4 días de salario mínimo por remesa cuando se trate de embarques con peso hasta de 200 kg. DÉCIMA PRIMERA.- El precio del transporte deberá pagarse en origen, salvo convenio entre las partes de pago en destino. Cuando el transporte se hubiere concertado 'Flete por Cobrar' la entrega de las mercancías o efectos se hará contra el pago del flete y el 'Transportista' tendrá derecho a retenerlos mientras no se le cubra el precio convenido. DÉCIMA SEGUNDA.- Si al momento de la entrega resultare algún faltante o avería, el consignatario deberá hacerla constar en ese acto en la Carta de Porte y formular su reclamación por escrito al 'Transportista' dentro de las 24 horas siguientes. DÉCIMA TERCERA.- El 'Transportista' queda eximido de la obligación de recibir mercancías o efectos para su transporte, en los siguientes casos: a) Cuando se trate de carga que por su naturaleza, peso, volumen, embalaje defectuoso o cualquier otra circunstancia no pueda transportarse sin destruirse o sin causar daño a los demás artículos o al material rodante, salvo que la empresa de que se trate tenga el equipo adecuado. b) Las mercancías cuyo transporte haya sido prohibido por disposiciones legales o reglamentarias. Cuando tales disposiciones no prohíban precisamente el transporte de determinadas mercancías, pero sí ordenen la presentación de ciertos documentos para que puedan ser transportadas, el 'Remitente' o 'Expedidor' estará obligado a entregar al 'Transportista' los documentos correspondientes. DÉCIMA CUARTA.- Los casos no previstos en las presentes condiciones y las quejas derivadas de su aplicación se someterán por la vía administrativa a la Secretaría de Comunicaciones y Transportes. DÉCIMA QUINTA.- Para el caso de que el 'Remitente' o 'Expedidor' contrate carro por entero, este aceptará la responsabilidad solidaria para con el 'Transportista' mediante la figura de la corresponsabilidad que contempla el artículo 10 del Reglamento Sobre el Peso, Dimensiones y Capacidad de los Vehículos de Autotransporte que Transitan en los Caminos y Puentes de Jurisdicción Federal, por lo que el 'Remitente' o 'Expedidor' queda obligado a verificar que la carga y el vehículo que la transporta, cumplan con el peso y dimensiones máximas establecidos en la NOM-012-SCT-2-2014. Para el caso de incumplimiento e inobservancia a las disposiciones que regulan el peso y dimensiones, por parte del 'Remitente' o 'Expedidor', este será corresponsable de las infracciones y multas que la Secretaría de Comunicaciones y Transportes y la Policía Federal impongan al 'Transportista' por cargar las unidades con exceso de peso."


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

        cert_conf = self.db.query(SystemConfig).filter_by(key="sat_cert_path").first()
        key_conf = self.db.query(SystemConfig).filter_by(key="sat_key_path").first()
        pass_conf = (
            self.db.query(SystemConfig).filter_by(key="sat_key_password").first()
        )

        self.path_cer = (
            Path(cert_conf.value)
            if cert_conf and cert_conf.value
            else (self.cert_dir / "CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer")
        )
        self.path_key = (
            Path(key_conf.value)
            if key_conf and key_conf.value
            else (self.cert_dir / "CSD_Sucursal_1_EKU9003173C9_20230517_223850.key")
        )
        self.key_password = pass_conf.value if pass_conf else "12345678a"

    # =======================================================
    # FASE 3: Carta Porte Provisional ($1 MXN) (BYPASS)
    # =======================================================
    def generar_carta_porte_nominal(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador = self._obtener_datos_completos(
            invoice_data.viaje_id, is_final=False
        )
        data = self._build_dict_from_models(
            viaje, cliente, unidad, operador, is_nominal=True
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
            concepto=f"Carta Porte Nominal Operativa - Viaje {viaje.id}",
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
            if nueva_factura.uuid:
                viaje.uuid_fiscal = nueva_factura.uuid
                self.db.add(viaje)
                self.db.commit()
            return nueva_factura
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail="Error al guardar factura nominal en BD."
            )

    def generar_factura_final_relacionada(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador = self._obtener_datos_completos(
            invoice_data.viaje_id, is_final=True
        )
        data = self._build_dict_from_models(
            viaje, cliente, unidad, operador, is_nominal=False
        )
        resultado_pac = self._importar_comprobante_ws(
            data, relacion_uuid=invoice_data.uuid_relacionado
        )

        monto_total = Decimal(data["total"])
        nueva_factura = ReceivableInvoice(
            client_id=viaje.client_id,
            viaje_id=viaje.id,
            uuid=getattr(resultado_pac, "uuid", None),
            uuid_relacionado=invoice_data.uuid_relacionado,
            is_nominal=False,
            status_sat="TIMBRADA",
            estatus="pendiente",
            concepto=f"Factura Ingreso Flete - Viaje {viaje.id}",
            monto_total=monto_total,
            saldo_pendiente=monto_total,
            subtotal=Decimal(data["subtotal"]),
            iva=Decimal(data["iva"]),
            retenciones=Decimal(data["retenciones"]),
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

    def cancelar_factura_nominal(
        self, invoice_id: int, motivo: str, uuid_sustituto: str = None
    ):
        factura = self.db.get(ReceivableInvoice, invoice_id)
        if not factura or not factura.uuid:
            return
        try:
            factura.status_sat = "CANCELADA"
            self.db.add(factura)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelando UUID nominal {factura.uuid}: {e}")

    # =======================================================
    # LÓGICA DE EXTRACCIÓN (BLINDADA CONTRA EL 400 DE UNIDADES NULAS)
    # =======================================================
    def _obtener_datos_completos(self, viaje_id: int, is_final: bool):
        viaje = self.db.get(Trip, viaje_id)
        if not viaje:
            raise HTTPException(status_code=404, detail="Viaje no encontrado")

        cliente = self.db.get(ClientModel, viaje.client_id)

        if is_final:
            leg = (
                self.db.query(TripLeg)
                .filter(
                    TripLeg.trip_id == viaje_id,
                    TripLeg.leg_type == "ruta_carretera",
                    TripLeg.unit_id.isnot(None),
                )
                .first()
            )
            if not leg:
                raise HTTPException(
                    status_code=400,
                    detail="No hay unidad/operador asignado para el tramo en carretera (Factura Final).",
                )
            unidad = self.db.get(Unit, leg.unit_id)
            operador = (
                self.db.get(Operator, leg.operator_id) if leg.operator_id else None
            )
        else:
            leg = self.db.query(TripLeg).filter(TripLeg.trip_id == viaje_id).first()
            unidad = self.db.get(Unit, leg.unit_id) if leg and leg.unit_id else None
            operador = (
                self.db.get(Operator, leg.operator_id)
                if leg and leg.operator_id
                else None
            )

        return viaje, cliente, unidad, operador

    def _build_dict_from_models(
        self, viaje, cliente, unidad, operador, is_nominal: bool
    ) -> dict:
        fecha_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

        # PROTECCIÓN CONTRA NULOS: Asignación de Unidad Comodín si la DB no nos dio una
        placas_seguras = unidad.placas if unidad and unidad.placas else "89BH4C"
        anio_seguro = str(unidad.year) if unidad and unidad.year else "2024"
        config_segura = (
            unidad.config_vehicular_sat
            if unidad and getattr(unidad, "config_vehicular_sat", None)
            else "T3S2"
        )
        permiso_seguro = (
            str(getattr(unidad, "permiso_sct_tipo", "TPAF01") or "TPAF01")
            .split(" ")[0]
            .strip()
            if unidad
            else "TPAF01"
        )
        num_permiso_seguro = (
            getattr(unidad, "permiso_sct_folio", "3066RTX02122011230301021")
            or "3066RTX02122011230301021"
            if unidad
            else "3066RTX02122011230301021"
        )
        aseg_segura = (
            getattr(unidad, "aseguradora_resp_civil", "QUALITAS") or "QUALITAS"
            if unidad
            else "QUALITAS"
        )
        poliza_segura = (
            getattr(unidad, "poliza_resp_civil", "7050094731") or "7050094731"
            if unidad
            else "7050094731"
        )

        # 🚀 OBTENER LEYENDA LEGAL DE LA BASE DE DATOS
        leyenda_conf = (
            self.db.query(SystemConfig).filter_by(key="sat_leyenda_legal").first()
        )
        leyenda_legal = (
            leyenda_conf.value
            if leyenda_conf and leyenda_conf.value
            else DEFAULT_LEYENDA
        )

        if is_nominal:
            subtotal = Decimal("1.00")
            iva = subtotal * Decimal("0.16")
            ret = subtotal * Decimal("0.04")
            total = subtotal + iva - ret

            rfc_operador = "XAXX010101000"
            nombre_operador = "OPERADOR BASE COMODIN"
            licencia = "LIC0000000"

            if operador:
                rfc_operador = operador.rfc or rfc_operador
                nombre_operador = operador.name or nombre_operador
                licencia = operador.license_number or licencia
        else:
            base = Decimal(str(viaje.tarifa_base or 0))
            casetas = Decimal(str(viaje.costo_casetas or 0))
            subtotal = base + casetas
            iva, ret = (subtotal * Decimal("0.16"), subtotal * Decimal("0.04"))
            total = subtotal + iva - ret

            if not operador:
                raise HTTPException(
                    status_code=400, detail="Operador faltante para la factura final."
                )

            rfc_operador = operador.rfc or "XAXX010101000"
            nombre_operador = operador.name or "OPERADOR DESCONOCIDO"
            licencia = operador.license_number or "LIC0000000"

        cp_cliente = getattr(cliente, "codigo_postal_fiscal", "09040") or "09040"
        ubicacion = (
            self.db.query(SatLocationCode)
            .filter(SatLocationCode.codigo_postal == cp_cliente)
            .first()
        )
        if ubicacion:
            cp_destino, estado_destino, municipio_destino = (
                cp_cliente,
                ubicacion.estado_clave,
                ubicacion.municipio_clave,
            )
        else:
            cp_destino, estado_destino, municipio_destino = ("09040", "CMX", "007")

        return {
            "folio": str(viaje.id),
            "fecha": fecha_iso,
            "rfc_cliente": getattr(cliente, "rfc", "CSJ871008UQ4"),
            "nombre_cliente": getattr(cliente, "razon_social", "CREMERIA SAN JOSE"),
            "cp_cliente": cp_cliente,
            "cp_destino": cp_destino,
            "estado_destino": estado_destino,
            "municipio_destino": municipio_destino,
            "regimen_cliente": str(getattr(cliente, "regimen_fiscal", "601") or "601"),
            "uso_cfdi": getattr(cliente, "uso_cfdi", "G03") or "G03",
            "subtotal": f"{subtotal:.2f}",
            "iva": f"{iva:.2f}",
            "retenciones": f"{ret:.2f}",
            "total": f"{total:.2f}",
            "placas": placas_seguras,
            "anio_modelo": anio_seguro,
            "config_vehicular": config_segura,
            "peso_bruto_vehicular": "25.00",
            "permiso_sct": permiso_seguro,
            "num_permiso": num_permiso_seguro,
            "aseguradora": aseg_segura,
            "poliza": poliza_segura,
            "subtipo_remolque": "CTR010",
            "placa_remolque": "58UD5Z",
            "rfc_operador": rfc_operador,
            "nombre_operador": nombre_operador,
            "licencia": licencia,
            "leyenda_legal": leyenda_legal,  # 🚀 Pasamos la leyenda al template
        }

    # =======================================================
    # MOTOR ZEEP / COMUNICACIÓN PAC
    # =======================================================
    def _importar_comprobante_ws(self, data: dict, relacion_uuid: str = None):
        try:
            client = zeep.Client(self.wsdl_timbrado, plugins=[self.history])
            xml_base = self._armar_xml_sin_sello(data, relacion_uuid)
            xml_sellado = self._sellar_xml(xml_base, data)
            result = client.service.timbrar(
                self.pac_user, self.pac_pass, xml_sellado.encode("utf-8"), False
            )
            if int(getattr(result, "status", 0)) != 200:
                raise HTTPException(status_code=400, detail=f"PAC: {result.mensaje}")
            res_sat = result.resultados[0]
            if int(getattr(res_sat, "status", 0)) == 200:
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
                    data, res_sat.uuid, qr_bytes, s_sat, s_emi, c_sat
                )
                return res_sat
            else:
                raise HTTPException(status_code=400, detail=f"SAT: {res_sat.mensaje}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def _sellar_xml(self, xml_str, data):
        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data)
            cert_b64 = base64.b64encode(cer_data).decode("utf-8").replace("\n", "")
            sn_hex = format(cert.serial_number, "x")
            no_certificado = "".join([sn_hex[i] for i in range(1, len(sn_hex), 2)])

        cadena = (
            f"||4.0|A|{data['folio']}|{data['fecha']}|03|{no_certificado}|CONTADO|{data['subtotal']}|MXN|{data['total']}|I|01|PUE|91808|"
            f"EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|622|"
            f"{data['rfc_cliente']}|{data['nombre_cliente']}|{data['cp_cliente']}|{data['regimen_cliente']}|{data['uso_cfdi']}|"
            f"78101802|SERV001|1.00|E48|SERVICIO|SERVICIO DE FLETE GENERAL|{data['subtotal']}|{data['subtotal']}|02|"
            f"{data['subtotal']}|002|Tasa|0.160000|{data['iva']}|"
            f"{data['subtotal']}|002|Tasa|0.040000|{data['retenciones']}|"
            f"002|{data['retenciones']}|{data['retenciones']}|"
            f"{data['subtotal']}|002|Tasa|0.160000|{data['iva']}|{data['iva']}|"
            f"3.1|CCCe3b8d-a5c4-d91d-2b7a-8951836e3433|No|480|"
            f"Origen|OR000001|EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|{data['fecha']}|17|193|VER|MEX|91808|"
            f"Destino|DE000001|{data['rfc_cliente']}|{data['nombre_cliente']}|{data['fecha']}|480|{data['municipio_destino']}|{data['estado_destino']}|MEX|{data['cp_destino']}|"
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

    def _armar_xml_sin_sello(self, data, relacion_uuid: str = None) -> str:
        relacion_xml = (
            f'\n    <cfdi:CfdiRelacionados TipoRelacion="04">\n        <cfdi:CfdiRelacionado UUID="{relacion_uuid}" />\n    </cfdi:CfdiRelacionados>'
            if relacion_uuid
            else ""
        )
        # 🚀 SE AGREGA LA ADDENDA AL FINAL DEL XML
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/CartaPorte31 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd" Version="4.0" Fecha="{data['fecha']}" Serie="A" Folio="{data['folio']}" FormaPago="03" CondicionesDePago="CONTADO" SubTotal="{data['subtotal']}" Moneda="MXN" Total="{data['total']}" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" LugarExpedicion="91808">{relacion_xml}
    <cfdi:Emisor Rfc="EKU9003173C9" Nombre="ESCUELA KEMPER URGATE SA DE CV" RegimenFiscal="622" />
    <cfdi:Receptor Rfc="{data['rfc_cliente']}" Nombre="{data['nombre_cliente']}" DomicilioFiscalReceptor="{data['cp_cliente']}" RegimenFiscalReceptor="{data['regimen_cliente']}" UsoCFDI="{data['uso_cfdi']}" />
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="78101802" NoIdentificacion="SERV001" Cantidad="1.00" ClaveUnidad="E48" Unidad="SERVICIO" Descripcion="SERVICIO DE FLETE GENERAL" ValorUnitario="{data['subtotal']}" Importe="{data['subtotal']}" ObjetoImp="02">
            <cfdi:Impuestos>
                <cfdi:Traslados><cfdi:Traslado Base="{data['subtotal']}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="{data['iva']}" /></cfdi:Traslados>
                <cfdi:Retenciones><cfdi:Retencion Base="{data['subtotal']}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.040000" Importe="{data['retenciones']}" /></cfdi:Retenciones>
            </cfdi:Impuestos>
        </cfdi:Concepto>
    </cfdi:Conceptos>
    <cfdi:Impuestos TotalImpuestosRetenidos="{data['retenciones']}" TotalImpuestosTrasladados="{data['iva']}">
        <cfdi:Retenciones><cfdi:Retencion Impuesto="002" Importe="{data['retenciones']}" /></cfdi:Retenciones>
        <cfdi:Traslados><cfdi:Traslado Base="{data['subtotal']}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="{data['iva']}" /></cfdi:Traslados>
    </cfdi:Impuestos>
    <cfdi:Complemento>
        <cartaporte31:CartaPorte Version="3.1" IdCCP="CCCe3b8d-a5c4-d91d-2b7a-8951836e3433" TranspInternac="No" TotalDistRec="480">
            <cartaporte31:Ubicaciones>
                <cartaporte31:Ubicacion TipoUbicacion="Origen" IDUbicacion="OR000001" RFCRemitenteDestinatario="EKU9003173C9" NombreRemitenteDestinatario="ESCUELA KEMPER URGATE SA DE CV" FechaHoraSalidaLlegada="{data['fecha']}">
                    <cartaporte31:Domicilio Localidad="17" Municipio="193" Estado="VER" Pais="MEX" CodigoPostal="91808" />
                </cartaporte31:Ubicacion>
                <cartaporte31:Ubicacion TipoUbicacion="Destino" IDUbicacion="DE000001" RFCRemitenteDestinatario="{data['rfc_cliente']}" NombreRemitenteDestinatario="{data['nombre_cliente']}" FechaHoraSalidaLlegada="{data['fecha']}" DistanciaRecorrida="480">
                    <cartaporte31:Domicilio Municipio="{data['municipio_destino']}" Estado="{data['estado_destino']}" Pais="MEX" CodigoPostal="{data['cp_destino']}" />
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
    <cfdi:Addenda>
        <fst3:Contrato xmlns:fst3="http://facturasoftesc.com/ns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://facturasoftesc.com/ns http://facturasoftesc.com/ns/fst3.xsd" Comentario="{data['leyenda_legal']}"></fst3:Contrato>
    </cfdi:Addenda>
</cfdi:Comprobante>""".strip()

    def _generar_pdf_con_diseno(self, data, uuid, qr_bytes, s_sat, s_emi, c_sat):
        from jinja2 import Environment, FileSystemLoader
        from xhtml2pdf import pisa

        logo_path = self.templates_dir / "assets" / "logo-black.png"
        logo_src = (
            f"data:image/png;base64,{base64.b64encode(open(logo_path, 'rb').read()).decode('utf-8')}"
            if logo_path.exists()
            else ""
        )
        qr_src = f"data:image/png;base64,{base64.b64encode(qr_bytes).decode('utf-8')}"

        env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        template = env.get_template("carta_porte.html")
        context = {
            "uuid": uuid,
            "folio_interno": data["folio"],
            "fecha_emision": data["fecha"],
            "logo_src": logo_src,
            "qr_src": qr_src,
            "id_ccp": "CCCe3b8d-a5c4-d91d-2b7a-8951836e3433",
            "nombre_cliente": data["nombre_cliente"],
            "rfc_cliente": data["rfc_cliente"],
            "cp_cliente": data["cp_cliente"],
            "regimen_cliente": data["regimen_cliente"],
            "uso_cfdi": data["uso_cfdi"],
            "cert_sat": c_sat,
            "sello_sat": s_sat,
            "sello_emisor": s_emi,
            "subtotal": data["subtotal"],
            "iva": data["iva"],
            "retenciones": data["retenciones"],
            "total": data["total"],
            "conceptos": [
                {
                    "clave": "78101802",
                    "cantidad": "1.00",
                    "unidad": "E48 - SRV",
                    "descripcion": "[78101802] FLETE CARGA GENERAL",
                    "precio_unitario": data["subtotal"],
                    "importe": data["subtotal"],
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
                    "cp": data["cp_destino"],
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
            "leyenda_legal": data["leyenda_legal"],  # 🚀 LEYENDA PASADA AL PDF
        }
        pdf_path = self.storage_dir / f"{uuid}.pdf"
        pisa.CreatePDF(
            BytesIO(template.render(context).encode("utf-8")), dest=open(pdf_path, "wb")
        )
        return pdf_path

    def _guardar_xml_disco(self, xml_bytes: bytes, uuid: str):
        with open(self.storage_dir / f"{uuid}.xml", "wb") as f:
            f.write(xml_bytes)
