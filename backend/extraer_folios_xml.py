import os
import re
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
            with open(xml_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(2000)  # Leemos solo el inicio del XML

                # Buscamos el atributo Folio="2571"
                m = re.search(r'Folio="([^"]+)"', content) or re.search(
                    r"Folio='([^']+)'", content
                )
                if m:
                    folio_real = m.group(1)
                    pago.folio_complemento = f"COM-{folio_real}"
                    db.add(pago)
                    print(
                        f"✅ Pago ID {pago.id} -> Se le asignó {pago.folio_complemento}"
                    )
                    corregidos += 1
                else:
                    print(f"⚠️ XML de {uuid} no tiene atributo Folio.")
        else:
            print(f"❌ No se encontró el XML físico para el UUID: {uuid}")

    db.commit()
    db.close()
    print(f"\n🚀 Proceso terminado. {corregidos} folios guardados en la Base de Datos.")


if __name__ == "__main__":
    procesar_xmls()
