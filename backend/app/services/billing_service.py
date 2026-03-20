import base64
import re
import logging
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import zeep
from zeep.plugins import HistoryPlugin  # Para capturar el XML en crudo
from lxml import etree
from fastapi import HTTPException
from sqlalchemy.orm import Session
from zeep.exceptions import Fault

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

# Configuración de Logging para auditoría
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

        # PLUGIN DE AUDITORÍA: Captura el tráfico SOAP real
        self.history = HistoryPlugin()

        # RUTAS DE CERTIFICADOS Y ALMACENAMIENTO
        self.base_path = Path(r"C:\xampp\htdocs\github\base-foundation\backend\app")
        self.cert_dir = self.base_path / "certs"
        self.storage_dir = self.base_path / "storage" / "xml_timbrados"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        self.path_cer = (
            self.cert_dir / "CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer"
        )
        self.path_key = (
            self.cert_dir / "CSD_Sucursal_1_EKU9003173C9_20230517_223850.key"
        )
        self.key_password = "12345678a"

        # ==========================================
        # MAPEO DE ERRORES: TIMBRADO
        # ==========================================
        self.PAC_ERRORS = {
            200: "OK",
            500: "Error interno PAC",
            601: "Auth Fallida",
            602: "Usuario bloqueado",
            604: "Límite de intentos",
            1402: "Emisor no encontrado",
        }
        self.SAT_ERRORS = {
            200: "Éxito",
            301: "XML Malformado",
            302: "Sello Inválido",
            303: "Certificado no corresponde",
            401: "Fecha fuera de rango",
        }

        # ==========================================
        # MAPEO DE ERRORES: CANCELACIÓN
        # ==========================================
        self.CANCEL_PAC_ERRORS = {
            200: "El proceso de cancelación se ha completado correctamente.",
            211: "La solicitud de cancelación del CFDI se encuentra en proceso.",
            500: "Errores internos han impedido el registro de la solicitud.",
            501: "Error interno de comunicación con la base de datos.",
            601: "Error de autenticación, usuario o contraseña incorrectos.",
            602: "La cuenta de usuario se encuentra bloqueada.",
            603: "La contraseña de la cuenta ha expirado.",
            604: "Se superó el número máximo de intentos de autenticación.",
            605: "El usuario se encuentra inactivo.",
            611: "Datos recibidos incompletos o fuera de lugar.",
            620: "Permiso denegado.",
            621: "Formato o estructura no válida.",
            630: "La implementación no tiene folios disponibles.",
            631: "La cuenta del usuario no tiene timbres disponibles.",
            633: "Uso indebido de cuenta prod/pruebas.",
            640: "Aplicación inactiva.",
            1701: "La llave privada y pública del CSD no corresponden.",
            1702: "La llave privada de la contraseña es incorrecta.",
            1703: "La llave privada no cumple con la estructura esperada.",
            1704: "La llave privada no es una llave RSA.",
            1710: "Estructura del certificado no cumple con X509.",
            1711: "El certificado no está vigente todavía.",
            1712: "El certificado ha expirado.",
            1713: "La llave pública no es una llave RSA.",
        }

        self.CANCEL_SAT_STATUS = {
            300: "Usuario No Válido.",
            301: "XML Mal Formado.",
            302: "Sello Mal Formado.",
            304: "Certificado Revocado o Caduco.",
            305: "Certificado Inválido.",
            310: "CSD Inválido.",
        }

        self.CANCEL_UUID_STATUS = {
            201: "Solicitud de cancelación recibida.",
            202: "Folio Fiscal Previamente Cancelado.",
            203: "Folio Fiscal No Correspondiente al Emisor.",
            204: "Folio Fiscal No Aplicable a Cancelación.",
            205: "Folio Fiscal No Existente.",
            206: "UUID no corresponde a un CFDI del Sector Primario.",
            207: "Folio sustitución Inválido.",
            208: "Fecha de Solicitud mayor a fecha de declaración.",
            209: "Fecha de Solicitud límite para factura global.",
            310: "CSD Inválido.",
            311: "Clave de motivo de cancelación no válida.",
            312: "UUID no relacionado según clave de motivo.",
        }

    # =========================================================================
    # LÓGICA DE TIMBRADO
    # =========================================================================
    def generar_carta_porte_nominal(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador = self._obtener_datos_completos(
            invoice_data.viaje_id
        )

        resultado_pac = self._importar_comprobante_ws(viaje)
        monto_total = Decimal("1.00")

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
            iva=Decimal("0.00"),
            retenciones=Decimal("0.00"),
            moneda="MXN",
            fecha_emision=date.today(),
            fecha_vencimiento=date.today(),
        )

        try:
            self.db.add(nueva_factura)
            self.db.commit()
            self.db.refresh(nueva_factura)
            logger.info(
                f"✅ Factura persistida en DB: {nueva_factura.id} | UUID: {nueva_factura.uuid}"
            )
            return nueva_factura
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Error al guardar factura timbrada en DB: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="El CFDI se timbró pero no se pudo guardar en DB.",
            )

    def _importar_comprobante_ws(self, viaje):
        try:
            client = zeep.Client(self.wsdl_timbrado, plugins=[self.history])
            fecha_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

            xml_base = self._armar_xml_sin_sello(viaje, fecha_iso)
            xml_sellado = self._sellar_xml(xml_base, fecha_iso, str(viaje.id))

            logger.info(f"== [REQUEST] Folio {viaje.id} enviando a timbrado ==")

            xml_bytes = xml_sellado.encode("utf-8")
            result = client.service.timbrar(
                self.pac_user, self.pac_pass, xml_bytes, False
            )

            status_pac = int(getattr(result, "status", 0))
            if status_pac != 200:
                logger.error(f"❌ FALLO PAC [{status_pac}]: {result.mensaje}")
                raise HTTPException(status_code=400, detail=f"PAC Error {status_pac}")

            res_sat = result.resultados[0]
            status_sat = int(getattr(res_sat, "status", 0))

            if status_sat == 200:
                logger.info(f"✅ SAT EXITOSO: UUID {res_sat.uuid}")
                self._guardar_xml_disco(res_sat.cfdiTimbrado, res_sat.uuid)
                self._generar_pdf_local(viaje, res_sat.uuid, res_sat.qrCode)
                return res_sat
            else:
                logger.error(f"❌ FALLO SAT [{status_sat}]: {res_sat.mensaje}")
                raise HTTPException(
                    status_code=400, detail=f"SAT Error {status_sat}: {res_sat.mensaje}"
                )

        except Exception as e:
            logger.exception("Error crítico en comunicación con PAC")
            raise HTTPException(status_code=500, detail=str(e))

    # =========================================================================
    # LÓGICA DE CANCELACIÓN
    # =========================================================================
    def cancelar_factura(
        self, invoice_id: int, motivo: str = "02", uuid_sustitucion: str = None
    ):
        """
        Inicia el proceso de cancelación en BD y manda la solicitud al PAC.
        """
        factura = self.db.get(ReceivableInvoice, invoice_id)
        if not factura:
            raise HTTPException(status_code=404, detail="Factura no encontrada en BD.")

        if not factura.uuid:
            raise HTTPException(
                status_code=400, detail="Esta factura no tiene un UUID válido."
            )

        if motivo == "01" and not uuid_sustitucion:
            raise HTTPException(
                status_code=400, detail="Motivo 01 requiere un UUID de sustitución."
            )

        resultado = self._cancelar_comprobante_ws(
            factura.uuid, motivo, uuid_sustitucion
        )

        status_uuid = int(getattr(resultado, "statusUUID", 0))

        # 201: Solicitud recibida | 202: Previamente cancelado
        if status_uuid in [201, 202]:
            factura.estatus = "cancelada"
            factura.status_sat = "CANCELADA"
            self.db.commit()
            logger.info(
                f"✅ Factura {invoice_id} (UUID: {factura.uuid}) marcada como CANCELADA en BD."
            )
            return {
                "status": "success",
                "message": "Cancelación procesada",
                "uuid": factura.uuid,
                "sat_status": status_uuid,
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"SAT rechazó la cancelación. Status: {status_uuid}",
            )

    def _cancelar_comprobante_ws(self, uuid: str, motivo: str, uuid_sustitucion: str):
        try:
            client = zeep.Client(self.wsdl_timbrado, plugins=[self.history])

            cadena_uuid = f"{uuid}|{motivo}|{uuid_sustitucion or ''}"
            lista_uuids = [cadena_uuid]

            with open(self.path_cer, "rb") as f_cer:
                cer_bytes = f_cer.read()
            with open(self.path_key, "rb") as f_key:
                key_bytes = f_key.read()

            logger.info(f"== [CANCEL] Enviando UUID {uuid} a cancelación ==")

            result = client.service.cancelar(
                self.pac_user,
                self.pac_pass,
                lista_uuids,
                cer_bytes,
                key_bytes,
                self.key_password,
            )

            status_pac = int(getattr(result, "status", 0))
            if status_pac not in [200, 211]:
                desc = self.CANCEL_PAC_ERRORS.get(status_pac, "Error Desconocido")
                logger.error(
                    f"❌ PAC RECHAZÓ CANCELACIÓN [{status_pac}]: {desc} - {result.mensaje}"
                )
                raise HTTPException(
                    status_code=400, detail=f"Error PAC {status_pac}: {desc}"
                )

            res_item = result.resultados[0]
            status_uuid = int(getattr(res_item, "statusUUID", 0))

            if status_uuid in [201, 202]:
                logger.info(
                    f"✅ ACEPTADO POR SAT [{status_uuid}]: {self.CANCEL_UUID_STATUS.get(status_uuid)}"
                )
                return res_item
            else:
                desc = self.CANCEL_UUID_STATUS.get(
                    status_uuid, "Estatus SAT no exitoso"
                )
                logger.error(f"❌ SAT RECHAZÓ CANCELACIÓN [{status_uuid}]: {desc}")
                raise HTTPException(
                    status_code=400, detail=f"Error SAT {status_uuid}: {desc}"
                )

        except Exception as e:
            logger.exception("Falla al comunicar con el WebService de Cancelación")
            raise HTTPException(status_code=500, detail=str(e))

    # =========================================================================
    # HELPERS Y ARMADO DE XML/PDF
    # =========================================================================
    def _guardar_xml_disco(self, xml_data_from_pac, uuid):
        try:
            file_path = self.storage_dir / f"{uuid}.xml"
            if isinstance(xml_data_from_pac, bytes):
                xml_final = xml_data_from_pac
            else:
                xml_final = base64.b64decode(xml_data_from_pac)

            with open(file_path, "wb") as f:
                f.write(xml_final)
            logger.info(f"💾 XML guardado en: {file_path.name}")
        except Exception as e:
            logger.error(f"Error guardando XML: {e}")

    def _sellar_xml(self, xml_str, fecha, folio):
        with open(self.path_cer, "rb") as f:
            cer_data = f.read()
            cert = x509.load_der_x509_certificate(cer_data)
            cert_b64 = (
                base64.b64encode(cer_data)
                .decode("utf-8")
                .replace("\n", "")
                .replace("\r", "")
            )
            sn_hex = format(cert.serial_number, "x")
            no_certificado = "".join([sn_hex[i] for i in range(1, len(sn_hex), 2)])

        cadena = (
            f"||4.0|A|{folio}|{fecha}|01|{no_certificado}|1.00|MXN|1.00|I|01|PUE|91808|"
            f"EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|622|"
            f"EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|91808|601|S01|"
            f"78101802|SERV001|1.00|E48|SERVICIO|SERVICIO DE FLETE|1.00|1.00|01||"
        )

        with open(self.path_key, "rb") as f:
            key_data = f.read()
            private_key = load_der_private_key(
                key_data, password=self.key_password.encode()
            )

        signature = private_key.sign(
            cadena.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256()
        )
        sello_b64 = base64.b64encode(signature).decode("utf-8")

        tag_start = "<cfdi:Comprobante"
        atributos_nuevos = f' Sello="{sello_b64}" NoCertificado="{no_certificado}" Certificado="{cert_b64}"'
        return xml_str.replace(tag_start, tag_start + atributos_nuevos)

    def _armar_xml_sin_sello(self, viaje, fecha) -> str:
        folio = str(viaje.id)
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
    xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" 
    Version="4.0" Fecha="{fecha}" Serie="A" Folio="{folio}" FormaPago="01" SubTotal="1.00" Moneda="MXN" Total="1.00" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" LugarExpedicion="91808">
    <cfdi:Emisor Rfc="EKU9003173C9" Nombre="ESCUELA KEMPER URGATE SA DE CV" RegimenFiscal="622" />
    <cfdi:Receptor Rfc="EKU9003173C9" Nombre="ESCUELA KEMPER URGATE SA DE CV" DomicilioFiscalReceptor="91808" RegimenFiscalReceptor="601" UsoCFDI="S01" />
    <cfdi:Conceptos>
        <cfdi:Concepto ClaveProdServ="78101802" NoIdentificacion="SERV001" Cantidad="1.00" ClaveUnidad="E48" Unidad="SERVICIO" Descripcion="SERVICIO DE FLETE" ValorUnitario="1.00" Importe="1.00" ObjetoImp="01" />
    </cfdi:Conceptos>
</cfdi:Comprobante>""".strip()

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

    def _generar_pdf_local(self, viaje, uuid, qr_bytes_crudos):
        from jinja2 import Template
        from xhtml2pdf import pisa
        from io import BytesIO

        try:
            qr_b64 = base64.b64encode(qr_bytes_crudos).decode("utf-8")
            qr_src = f"data:image/png;base64,{qr_b64}"

            html_template = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Helvetica, sans-serif; font-size: 12px; color: #333; }
                        .header { background-color: #004080; color: white; padding: 15px; text-align: center; }
                        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        .table th { background-color: #f2f2f2; border: 1px solid #ddd; padding: 8px; text-align: left; }
                        .table td { border: 1px solid #ddd; padding: 8px; }
                        .footer { margin-top: 30px; font-size: 10px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>FACTURA / CARTA PORTE (INGRESO)</h2>
                        <p><strong>UUID:</strong> {{ uuid }}</p>
                    </div>
                    
                    <table class="table">
                        <tr>
                            <th>Emisor</th>
                            <th>Receptor</th>
                        </tr>
                        <tr>
                            <td>
                                <strong>ESCUELA KEMPER URGATE SA DE CV</strong><br>
                                RFC: EKU9003173C9<br>
                                Régimen: 622
                            </td>
                            <td>
                                <strong>ESCUELA KEMPER URGATE SA DE CV</strong><br>
                                RFC: EKU9003173C9<br>
                                Uso CFDI: S01
                            </td>
                        </tr>
                    </table>

                    <table class="table">
                        <tr>
                            <th>Cant.</th>
                            <th>Unidad</th>
                            <th>Concepto</th>
                            <th>Precio Unitario</th>
                            <th>Importe</th>
                        </tr>
                        <tr>
                            <td>1.00</td>
                            <td>E48 (SERVICIO)</td>
                            <td>SERVICIO DE FLETE (Viaje {{ viaje_id }})</td>
                            <td>$1.00</td>
                            <td>$1.00</td>
                        </tr>
                    </table>

                    <div class="footer">
                        <table>
                            <tr>
                                <td style="width: 25%; text-align: center;">
                                    <img src="{{ qr_src }}" width="140" height="140">
                                </td>
                                <td style="width: 75%; padding-left: 20px;">
                                    <p><strong>Cadena Original del Complemento de Certificación:</strong></p>
                                    <p style="word-wrap: break-word; font-size: 8px;">||1.1|{{ uuid }}|... Aquí va la cadena del timbre ...||</p>
                                    <p><strong>Este documento es una representación impresa de un CFDI 4.0</strong></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </body>
                </html>
                """

            template = Template(html_template)
            html_renderizado = template.render(
                uuid=uuid, viaje_id=viaje.id, qr_src=qr_src
            )

            pdf_path = self.storage_dir / f"{uuid}.pdf"
            with open(pdf_path, "wb") as pdf_file:
                pisa.CreatePDF(BytesIO(html_renderizado.encode("utf-8")), dest=pdf_file)

            logger.info(f"📄 PDF Generado: {pdf_path.name}")
            return pdf_path

        except Exception as e:
            logger.error(f"Error generando PDF: {e}")
            return None
