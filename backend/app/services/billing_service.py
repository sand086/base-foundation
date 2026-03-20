import base64
import re
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import zeep
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


class BillingService:
    def __init__(self, db: Session):
        self.db = db
        self.wsdl_timbrado = (
            "https://testing.solucionfactible.com/ws/services/Timbrado?wsdl"
        )
        self.pac_user = "testing@solucionfactible.com"
        self.pac_pass = "timbrado.SF.16672"

        # RUTAS DE CERTIFICADOS
        self.cert_dir = Path(
            r"C:\xampp\htdocs\github\base-foundation\backend\app\certs"
        )
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
        resultado_pac = self._importar_comprobante_ws(viaje)

        nueva_factura = ReceivableInvoice(
            client_id=viaje.client_id,
            viaje_id=viaje.id,
            uuid=getattr(resultado_pac, "uuid", None),
            monto_total=Decimal("1.00"),
            is_nominal=True,
            status_sat="TIMBRADA",
            concepto=f"Carta Porte nominal viaje {viaje.id}",
            fecha_emision=date.today(),
            fecha_vencimiento=date.today(),
        )
        self.db.add(nueva_factura)
        self.db.commit()
        self.db.refresh(nueva_factura)
        return nueva_factura

    def _importar_comprobante_ws(self, viaje):
        try:
            client = zeep.Client(self.wsdl_timbrado)
            # Fecha única para evitar discrepancias de milisegundos
            fecha_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

            # 1. Generamos el XML base
            xml_base = self._armar_xml_sin_sello(viaje, fecha_iso)

            # 2. SELLO LOCAL
            xml_sellado = self._sellar_xml(xml_base, fecha_iso, str(viaje.id))

            # 3. Enviar al PAC
            xml_bytes = xml_sellado.encode("utf-8")
            result = client.service.timbrar(
                self.pac_user, self.pac_pass, xml_bytes, False
            )

            print("\n>>> RESPUESTA DEL PAC:")
            print(result)

            status = str(getattr(result, "status", ""))
            if status != "200":
                msg = getattr(result, "mensaje", "Error desconocido")
                raise HTTPException(
                    status_code=400, detail=f"PAC Error [{status}]: {msg}"
                )

            res = result.resultados[0]
            if str(res.status) != "200":
                raise HTTPException(
                    status_code=400, detail=f"SAT Error [{res.status}]: {res.mensaje}"
                )

            return res

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error en proceso: {str(e)}")

    def _sellar_xml(self, xml_str, fecha, folio):
        # A. Cargar Certificado
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

        # B. CADENA ORIGINAL (Siguiendo el rastro del error del PAC)
        # Usamos EKU como receptor para evitar el error 40130 de Factura Global
        cadena = (
            f"||4.0|A|{folio}|{fecha}|01|{no_certificado}|1.00|MXN|1.00|I|01|PUE|91808|"
            f"EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|622|"
            f"EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|91808|601|S01|"
            f"78101802|SERV001|1.00|E48|SERVICIO|SERVICIO DE FLETE|1.00|1.00|01||"
        )

        # C. Firmar
        with open(self.path_key, "rb") as f:
            key_data = f.read()
            private_key = load_der_private_key(
                key_data, password=self.key_password.encode()
            )

        signature = private_key.sign(
            cadena.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256()
        )
        sello_b64 = base64.b64encode(signature).decode("utf-8")

        # D. Inyectar
        tag_start = "<cfdi:Comprobante"
        atributos_nuevos = f' Sello="{sello_b64}" NoCertificado="{no_certificado}" Certificado="{cert_b64}"'
        return xml_str.replace(tag_start, tag_start + atributos_nuevos)

    def _armar_xml_sin_sello(self, viaje, fecha) -> str:
        folio = str(viaje.id)
        # IMPORTANTE: El Receptor es EKU para coincidir con la cadena de arriba
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
        operador = self.db.get(Operator, leg.operator_id) if leg.operator_id else None
        return viaje, cliente, unidad, operador
