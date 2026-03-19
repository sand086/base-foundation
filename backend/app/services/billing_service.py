import base64
import re
import uuid
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP

import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.models import Trip, TripLeg, ReceivableInvoice, Client, Unit, Operator

from app.schemas.trips import ReceivableInvoiceCreate


class BillingService:
    def __init__(self, db: Session):
        self.db = db

        # QA / Testing - Solución Factible
        self.pac_url = "https://testing.solucionfactible.com/ERPWebServices/soap/CFDI33"
        self.pac_user = "testing@solucionfactible.com"
        self.pac_pass = "a0123456789"

        # RFC emisor de pruebas SAT / SF
        self.emisor_rfc = "EKU9003173C9"
        self.emisor_nombre = "ES CUENTA UNICA DE PUEBLA S DE RL DE CV"
        self.emisor_regimen = "601"
        self.emisor_cp = "01000"

    # =========================
    # API pública del servicio
    # =========================
    def generar_carta_porte_nominal(
        self, invoice_data: ReceivableInvoiceCreate
    ) -> ReceivableInvoice:
        viaje, cliente, unidad, operador = self._obtener_datos_completos(
            invoice_data.viaje_id
        )

        txt_payload = self._armar_sferp_txt_carta_porte(
            viaje=viaje,
            cliente=cliente,
            unidad=unidad,
            operador=operador,
            monto_total=Decimal("1.00"),
        )

        pac_uuid, pac_xml_url = self._llamar_pac_importar_txt(
            txt_payload,
            f"CartaPorte_Viaje_{viaje.id}.txt",
        )

        nueva_factura = ReceivableInvoice(
            client_id=viaje.client_id,
            viaje_id=viaje.id,
            uuid=pac_uuid,
            monto_total=Decimal("1.00"),
            is_nominal=True,
            status_sat="TIMBRADA",
            concepto=f"Carta Porte nominal viaje {viaje.id}",
            xml_url=pac_xml_url,
            fecha_emision=date.today(),
            fecha_vencimiento=date.today(),
        )
        self.db.add(nueva_factura)
        self.db.commit()
        self.db.refresh(nueva_factura)
        return nueva_factura

    # =========================
    # PAC
    # =========================
    def _llamar_pac_importar_txt(self, txt_payload: str, filename: str):
        """
        Envía un Conector TXT SFERP 6.0 al método importar.
        """
        payload_b64 = base64.b64encode(txt_payload.encode("utf-8")).decode("utf-8")

        soap_body = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fac="http://facturacion.erp.solucionfactible.com">
  <soapenv:Header/>
  <soapenv:Body>
    <fac:importar>
      <usuario>{self.pac_user}</usuario>
      <password>{self.pac_pass}</password>
      <archivoConector>{payload_b64}</archivoConector>
      <nombreArchivo>{filename}</nombreArchivo>
    </fac:importar>
  </soapenv:Body>
</soapenv:Envelope>"""

        try:
            response = requests.post(
                self.pac_url,
                data=soap_body.encode("utf-8"),
                headers={
                    "Content-Type": "text/xml; charset=UTF-8",
                    "SOAPAction": '""',
                },
                timeout=60,
            )

            response.raise_for_status()
            raw = response.text

            print("\n>>> DEBUG TXT ENVIADO AL PAC")
            print(txt_payload)
            print("\n>>> RESPUESTA CRUDA PAC")
            print(raw)

            estatus_match = re.search(
                r"<estatus>(.*?)</estatus>", raw, re.IGNORECASE | re.DOTALL
            )
            mensaje_match = re.search(
                r"<mensaje>(.*?)</mensaje>", raw, re.IGNORECASE | re.DOTALL
            )
            uuid_match = re.search(
                r"<uuid>(.*?)</uuid>", raw, re.IGNORECASE | re.DOTALL
            )

            estatus = estatus_match.group(1).strip() if estatus_match else None
            mensaje = (
                mensaje_match.group(1).strip()
                if mensaje_match
                else "Error de validación PAC"
            )

            if estatus == "200" and uuid_match:
                pac_uuid = uuid_match.group(1).strip()
                return (
                    pac_uuid,
                    f"https://solucionfactible.com/descarga?uuid={pac_uuid}",
                )

            raise HTTPException(
                status_code=400,
                detail=f"PAC Error [{estatus or 'sin_estatus'}]: {mensaje}",
            )

        except HTTPException:
            raise
        except requests.RequestException as e:
            raise HTTPException(
                status_code=502,
                detail=f"Error de comunicación con PAC: {str(e)}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Falla técnica al timbrar Carta Porte: {str(e)}",
            )

    # =========================
    # Conector TXT SFERP 6.0
    # =========================
    def _armar_sferp_txt_carta_porte(
        self, viaje, cliente, unidad, operador, monto_total: Decimal
    ) -> str:
        """
        Construye un archivo Conector TXT v6.0 para CFDI 4.0 con Complemento Carta Porte 3.1
        enfocado a QA/testing.
        """
        now = datetime.now()
        fecha_general = now.strftime("%d/%m/%Y %H:%M:%S")
        fecha_iso = now.strftime("%Y-%m-%dT%H:%M:%S")
        id_ccp = str(uuid.uuid4()).upper()

        # -------- Datos saneados --------
        folio = str(viaje.id)
        serie = "CP"

        # Receptor nominal QA
        receptor_nombre = self._sanitize_pipe(
            cliente.name if getattr(cliente, "name", None) else "PUBLICO EN GENERAL"
        )
        receptor_rfc = self._sanitize_pipe(
            getattr(cliente, "rfc", None) or "XAXX010101000"
        )
        receptor_uso_cfdi = "G03"
        receptor_regimen = self._sanitize_pipe(
            getattr(cliente, "regimen_fiscal", None) or "601"
        )

        # Dirección receptor / destino
        receptor_pais = "MEX"
        receptor_estado = self._estado_sat(
            getattr(cliente, "state_code", None)
            or getattr(cliente, "state", None)
            or "MEX"
        )
        receptor_cp = self._cp(
            getattr(cliente, "postal_code", None)
            or getattr(cliente, "cp", None)
            or "50000"
        )
        receptor_calle = self._sanitize_pipe(
            getattr(cliente, "street", None) or "DOMICILIO DESTINO"
        )

        # Origen / emisor
        origen_estado = "CMX"
        origen_cp = self.emisor_cp
        origen_calle = "DOMICILIO ORIGEN"

        # Unidad / operador
        placa_vm = self._placa(getattr(unidad, "placas", None) or "ABC1234")
        anio_modelo = (
            self._only_digits(str(getattr(unidad, "year", None) or "2022"))[:4]
            or "2022"
        )
        operador_nombre = self._sanitize_pipe(
            getattr(operador, "name", None)
            or getattr(operador, "nombre", None)
            or "OPERADOR PRUEBA"
        )

        # Datos logísticos mínimos QA
        distancia_km = Decimal("100.00")
        peso_kg = Decimal("1000.000")
        cantidad_mercancia = Decimal("1.000000")
        config_vehicular = "C2R3"
        permiso_sct = "TPAF01"
        num_permiso_sct = "01231014210"
        aseguradora = "QUALITAS"
        poliza = "POL123456"

        # Concepto nominal sin impuestos
        subtotal = self._money(monto_total)
        total = self._money(monto_total)

        # -------- Armado secuencial del TXT --------
        lines = [
            "SFERP|6.0|",
            f"Comprobante|{folio}|{serie}|true|||01|",
            f"Generales|{fecha_general}|03||PUE|{self.emisor_regimen}||Carta Porte nominal QA|{self.emisor_cp}|",
            "Divisa|Peso Mexicano|MXN|1|",
            f"Receptor|{receptor_nombre}|{receptor_rfc}|||||{receptor_uso_cfdi}|{receptor_regimen}|",
            f"DireccionFiscal|MEXICO|{receptor_estado}|||||||{receptor_cp}|",
            f"Concepto|CP31|SERVICIO DE FLETE|E48|1|{subtotal}||{subtotal}||||78101802|E48|01|",
            f"Totales|{subtotal}|0.00|0.00|0.00|{total}|",
            "Complemento|CartaPorte31|",
            f"CartaPorte|{id_ccp}|No|||||{self._qty(distancia_km, 2)}|||",
            f"Ubicacion|Origen|OR000001|{self.emisor_rfc}|{self._sanitize_pipe(self.emisor_nombre)}||||||{fecha_iso}||",
            f"DomicilioUbicacion|{origen_calle}|||||||{origen_estado}|MEX|{origen_cp}",
            f"Ubicacion|Destino|DE000001|{receptor_rfc}|{receptor_nombre}||||||{fecha_iso}||{self._qty(distancia_km, 2)}",
            f"DomicilioUbicacion|{receptor_calle}|||||||{receptor_estado}|MEX|{receptor_cp}",
            f"Mercancias|{self._qty(peso_kg, 3)}|KGM||1||",
            (
                "Mercancia|"
                "78101802|"  # BienesTransp
                "|"  # ClaveSTCC
                "CARGA QA|"  # Descripcion
                f"{self._qty(cantidad_mercancia, 6)}|"
                "E48|"  # ClaveUnidad
                "SERVICIO|"  # Unidad
                "|"  # Dimensiones
                "|"  # MaterialPeligroso
                "|"  # CveMaterialPeligroso
                "|"  # Embalaje
                "|"  # DescripEmbalaje
                f"{self._qty(peso_kg, 3)}|"  # PesoEnKg
                "|"  # ValorMercancia
                "|"  # Moneda
                "|"  # FraccionArancelaria
                "|"  # UUIDComercioExt
                "|"  # Pedimento
                "|"  # GuiaIdentificacion
                "|"  # CantidadTransporta
                "|"  # DetalleMercancia
                "|"  # UnidadPesoMerc
                "|"  # PesoBruto
                "|"  # PesoNeto
                "|"  # PesoTara
                "|"  # NumPiezas
                "|"  # TipoMateria
                "|"  # DescripcionMateria
            ),
            f"Autotransporte|{permiso_sct}|{num_permiso_sct}",
            f"IdentificacionVehicular|{config_vehicular}|20|{placa_vm}|{anio_modelo}",
            f"Seguros|{aseguradora}|{poliza}|||||",
            f"TiposFigura|01|XAXX010101000|1234567890|{operador_nombre}||",
        ]

        return "\n".join(lines)

    # =========================
    # Helpers
    # =========================
    def _obtener_datos_completos(self, viaje_id: int):
        viaje = self.db.query(Trip).get(viaje_id)
        if not viaje:
            raise HTTPException(status_code=404, detail="Viaje no encontrado")

        cliente = self.db.query(Client).get(viaje.client_id)
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        leg = (
            self.db.query(TripLeg)
            .filter(TripLeg.trip_id == viaje_id, TripLeg.unit_id != None)
            .first()
        )
        if not leg:
            raise HTTPException(
                status_code=400, detail="El viaje no tiene tramo con unidad asignada"
            )

        unidad = self.db.query(Unit).get(leg.unit_id)
        if not unidad:
            raise HTTPException(status_code=404, detail="Unidad no encontrada")

        operador = self.db.query(Operator).get(leg.operator_id)
        if not operador:
            raise HTTPException(status_code=404, detail="Operador no encontrado")

        return viaje, cliente, unidad, operador

    def _sanitize_pipe(self, value: str) -> str:
        if value is None:
            return ""
        text = str(value).strip()
        text = text.replace("|", " ")
        text = text.replace("\r", " ").replace("\n", " ")
        text = re.sub(r"\s+", " ", text)
        return text

    def _only_digits(self, value: str) -> str:
        return re.sub(r"[^0-9]", "", str(value or ""))

    def _placa(self, value: str) -> str:
        # SF pide sin guiones ni espacios
        cleaned = re.sub(r"[^A-Za-z0-9]", "", str(value or "").upper())
        return cleaned[:10] if cleaned else "ABC1234"

    def _cp(self, value: str) -> str:
        digits = self._only_digits(value)
        return digits[:5].zfill(5) if digits else "00000"

    def _estado_sat(self, value: str) -> str:
        """
        Recibe MEX, EDOMEX, Estado de México, CDMX, Puebla, etc.
        Regresa clave corta compatible de pruebas.
        """
        raw = self._sanitize_pipe(value).upper()

        mapping = {
            "CIUDAD DE MEXICO": "CMX",
            "CDMX": "CMX",
            "CMX": "CMX",
            "MEXICO": "MEX",
            "ESTADO DE MEXICO": "MEX",
            "EDOMEX": "MEX",
            "MEX": "MEX",
            "PUEBLA": "PUE",
            "PUE": "PUE",
            "JALISCO": "JAL",
            "JAL": "JAL",
            "NUEVO LEON": "NLE",
            "NL": "NLE",
            "NLE": "NLE",
        }
        return mapping.get(raw, raw[:3] if len(raw) >= 3 else "MEX")

    def _money(self, value) -> str:
        return str(
            Decimal(str(value)).quantize(Decimal("0.00"), rounding=ROUND_HALF_UP)
        )

    def _qty(self, value, decimals: int = 3) -> str:
        pattern = "0." + ("0" * decimals)
        return str(
            Decimal(str(value)).quantize(Decimal(pattern), rounding=ROUND_HALF_UP)
        )
