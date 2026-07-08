import os
import xml.etree.ElementTree as ET
from app.db.database import SessionLocal
from app.models.models import ReceivableInvoicePayment


def procesar_xmls():
    db = SessionLocal()
    # Traemos todos los pagos que ya tienen un UUID de complemento timbrado
    pagos = (
        db.query(ReceivableInvoicePayment)
        .filter(ReceivableInvoicePayment.complemento_uuid.isnot(None))
        .all()
    )

    corregidos = 0

    print("🔍 Escaneando archivos XML en el disco...")
    for pago in pagos:
        uuid = pago.complemento_uuid

        # Buscamos el XML en tus carpetas
        rutas_posibles = [
            os.path.join("storage", "xml_timbrados", f"{uuid}.xml"),
            os.path.join("app", "storage", "xml_timbrados", f"{uuid}.xml"),
            os.path.join(
                "/home/desarrolloas/base-foundation/backend/storage/xml_timbrados",
                f"{uuid}.xml",
            ),
        ]

        xml_path = next((ruta for ruta in rutas_posibles if os.path.exists(ruta)), None)

        if xml_path:
            try:
                # Usamos el parser XML real de Python (Es 100% seguro y no se confunde)
                tree = ET.parse(xml_path)
                root = tree.getroot()

                # Vamos directo a extraer el atributo Folio del nodo principal (cfdi:Comprobante)
                folio_real = root.attrib.get("Folio")

                if folio_real:
                    pago.folio_complemento = f"COM-{folio_real}"
                    db.add(pago)
                    print(
                        f"✅ Pago ID {pago.id} -> Se le asignó {pago.folio_complemento}"
                    )
                    corregidos += 1
                else:
                    print(f"⚠️ XML de {uuid} no tiene atributo Folio en la cabecera.")

            except Exception as e:
                print(f"❌ Error al leer el XML de {uuid}: {e}")
        else:
            print(f"❌ No se encontró el XML físico para el UUID: {uuid}")

    db.commit()
    db.close()
    print(f"\n🚀 Proceso terminado. {corregidos} folios guardados en la Base de Datos.")


if __name__ == "__main__":
    procesar_xmls()
