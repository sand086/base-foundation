import os
import sys
from pathlib import Path
import xml.etree.ElementTree as ET
from datetime import datetime, datetime as dt

# Configurar el path para que reconozca los módulos de la app
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice, Client as ClientModel

# RUTA FÍSICA DEL ARCHIVO QUE ENCONTRASTE CON GREP
XML_FILE = "/home/desarrolloas/base-foundation/backend/app/storage/xml_timbrados/A3731D16-EB53-484F-9F87-346EC6DEDB7B.xml"
UUID_TIMBRADO = "A3731D16-EB53-484F-9F87-346EC6DEDB7B"


def inyectar_xml_a_base_de_datos():
    if not os.path.exists(XML_FILE):
        print(f"❌ El archivo XML no se encuentra en la ruta: {XML_FILE}")
        return

    db = next(get_db())

    print("📦 Parseando el archivo XML estructural del SAT...")
    try:
        ns = {
            "cfdi": "http://www.sat.gob.mx/cfd/4",
            "tfd": "http://www.sat.gob.mx/TimbreFiscalDigital",
        }

        tree = ET.parse(XML_FILE)
        root = tree.getroot()

        # 1. Extraer datos de la cabecera del Comprobante
        serie = root.attrib.get("Serie", "CP")
        folio = root.attrib.get("Folio", "17396")
        folio_interno = f"{serie}-{folio}"
        fecha_str = root.attrib.get("Fecha", "2026-06-01T15:16:13")
        fecha_emision = datetime.strptime(fecha_str.split("T")[0], "%Y-%m-%d").date()

        subtotal = float(root.attrib.get("SubTotal", 0.0))
        total = float(root.attrib.get("Total", 0.0))
        moneda = root.attrib.get("Moneda", "MXN")
        metodo_pago = root.attrib.get("MetodoPago", "PPD")
        forma_pago = root.attrib.get("FormaPago", "99")
        tipo_comprobante = root.attrib.get("TipoDeComprobante", "I")

        # Calcular IVA de forma segura (Diferencia estructural)
        iva = total - subtotal

        # 2. Buscar el RFC del Receptor para amarrarlo con tu catálogo de Clientes
        receptor_node = root.find("cfdi:Receptor", ns)
        if receptor_node is None:
            print("❌ No se encontró el nodo cfdi:Receptor en el XML.")
            return

        rfc_receptor = receptor_node.attrib.get("Rfc")
        nombre_receptor = receptor_node.attrib.get("Nombre", "CLIENTE DESCONOCIDO")

        print(f"🔍 Buscando cliente en el ERP con RFC: {rfc_receptor}...")
        cliente = db.query(ClientModel).filter(ClientModel.rfc == rfc_receptor).first()

        if not cliente:
            print(
                f"⚠️ ATENCIÓN: El RFC {rfc_receptor} ({nombre_receptor}) no existe en tu tabla de clientes."
            )
            print(
                "Se creará el registro amarrado a un cliente temporal o ID genérico. Buscando fallback..."
            )
            cliente = db.query(
                ClientModel
            ).first()  # Fallback al primer cliente para no romper llaves foráneas
            if not cliente:
                print(
                    "❌ Error crítico: No hay ningún cliente en la base de datos para heredar la llave."
                )
                return

        # 3. Validar si ya existe para no duplicar llaves
        existe = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == UUID_TIMBRADO)
            .first()
        )
        if existe:
            print(
                f"💡 El UUID {UUID_TIMBRADO} ya existe en la base de datos (Folio Interno: {existe.folio_interno}). No se requiere re-inyección."
            )
            return

        # 4. Crear el registro estructural del modelo ReceivableInvoice
        nueva_factura = ReceivableInvoice(
            client_id=cliente.id,
            viaje_id=98,  # Mapeado al Viaje 98 según el cruce que detectamos
            folio_interno=folio_interno,
            uuid=UUID_TIMBRADO,
            is_nominal=False,  # Al ser de 40k de subtotal, es una factura real/one-shot
            status_sat="TIMBRADA",
            estatus="pendiente",
            concepto="FLETE DE CARGA GENERAL (RECUPERADO DE DISCO)",
            monto_total=total,
            saldo_pendiente=total,
            subtotal=subtotal,
            iva=iva,
            retenciones=0.00,
            moneda=moneda,
            fecha_emision=fecha_emision,
            fecha_vencimiento=fecha_emision,  # Fallback inmediato
            metodo_pago=metodo_pago,
            forma_pago=forma_pago,
            tipo_comprobante=tipo_comprobante,
            pdf_url=f"/api/sat/invoice/{UUID_TIMBRADO}/pdf",
            xml_url=f"/api/sat/invoice/{UUID_TIMBRADO}/xml",
        )

        db.add(nueva_factura)
        db.commit()

        print("\n" + "=" * 60)
        print(f"✅ ¡FACTURA INYECTADA CON ÉXITO EN LA BASE DE DATOS!")
        print(f"   - Folio Interno: {folio_interno}")
        print(f"   - UUID: {UUID_TIMBRADO}")
        print(f"   - Total Fiscal: ${total:,.2f} {moneda}")
        print(f"   - Cliente Asignado: {cliente.razon_social} (ID: {cliente.id})")
        print("=" * 60 + "\n")

    except Exception as e:
        db.rollback()
        print(f"❌ Error crítico procesando o insertando el archivo XML: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    inyectar_xml_a_base_de_datos()
