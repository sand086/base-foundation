import os
import sys
from pathlib import Path
from lxml import etree

# Configurar path para importar la app
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import SessionLocal
from app.models.models import ReceivableInvoicePayment

def rescatar_folios_desde_xml():
    db = SessionLocal()
    
    # 1. Buscar pagos que ya están timbrados
    pagos = db.query(ReceivableInvoicePayment).filter(
        ReceivableInvoicePayment.complemento_uuid.isnot(None),
        ReceivableInvoicePayment.complemento_uuid != "PENDIENTE_SAT"
    ).all()

    # 2. Definir dónde están guardados los XML
    base_path = Path(__file__).resolve().parent
    storage_dir = base_path / "storage" / "xml_timbrados"

    actualizados = 0
    ya_estaban_bien = 0
    errores = 0

    print("=" * 80)
    print(f"🔍 INICIANDO RESCATE: Se encontraron {len(pagos)} pagos timbrados.")
    print("=" * 80)

    for pago in pagos:
        xml_path = storage_dir / f"{pago.complemento_uuid}.xml"
        
        if xml_path.exists():
            try:
                # Parsear el XML
                tree = etree.parse(str(xml_path))
                root = tree.getroot()
                
                # Extraer el Folio del nodo principal <cfdi:Comprobante>
                folio_xml = root.get("Folio")
                
                if folio_xml:
                    folio_completo = f"COM-{folio_xml}"
                    
                    if pago.folio_complemento != folio_completo:
                        pago.folio_complemento = folio_completo
                        actualizados += 1
                        print(f" ✅ Pago ID {pago.id}: Folio actualizado a {folio_completo}")
                    else:
                        ya_estaban_bien += 1
            except Exception as e:
                print(f" ❌ Error leyendo XML {pago.complemento_uuid}: {e}")
                errores += 1
        else:
            print(f" ⚠️ XML físico NO encontrado para UUID: {pago.complemento_uuid}")
            errores += 1

    # Guardar cambios en la base de datos
    db.commit()
    db.close()
    
    print("\n" + "=" * 80)
    print("🏁 RESUMEN DEL RESCATE:")
    print(f"   - Folios extraídos y actualizados: {actualizados}")
    print(f"   - Folios que ya estaban correctos: {ya_estaban_bien}")
    print(f"   - Errores o XML no encontrados: {errores}")
    print("=" * 80)

if __name__ == "__main__":
    rescatar_folios_desde_xml()