import os
import sys
from pathlib import Path
from lxml import etree

# Configurar path para importar la app
base_dir = Path(__file__).resolve().parent
sys.path.append(str(base_dir))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoicePayment

def rescatar_folios_inteligente():
    db = SessionLocal()
    
    # 1. Buscar todos los pagos en BD que ya tienen UUID
    pagos = db.query(ReceivableInvoicePayment).filter(
        ReceivableInvoicePayment.complemento_uuid.isnot(None),
        ReceivableInvoicePayment.complemento_uuid != "PENDIENTE_SAT"
    ).all()

    print("=" * 80)
    print(f"🔍 INICIANDO RESCATE: {len(pagos)} pagos timbrados encontrados en la BD.")
    print("Mapeando todos los archivos XML en el servidor... (esto tomará unos segundos)")
    
    # 2. RASTREADOR: Buscar TODOS los XML en cualquier subcarpeta de 'backend'
    xml_map = {}
    for xml_path in base_dir.rglob("*.xml"):
        # Guardamos el UUID (nombre del archivo sin el .xml) en mayúsculas para comparar fácil
        uuid_key = xml_path.stem.upper()
        xml_map[uuid_key] = xml_path

    print(f"📁 ¡Se encontraron {len(xml_map)} archivos XML físicos en tu proyecto!")
    print("=" * 80)

    actualizados = 0
    ya_estaban_bien = 0
    errores = 0

    # 3. Emparejar BD con los XML reales
    for pago in pagos:
        uuid_pago = pago.complemento_uuid.upper().strip()
        
        # Si el rastreador encontró el archivo físico
        if uuid_pago in xml_map:
            xml_path = xml_map[uuid_pago]
            try:
                # Abrimos y leemos el XML
                tree = etree.parse(str(xml_path))
                root = tree.getroot()
                
                # Buscamos el atributo 'Folio' directamente de la etiqueta raíz
                folio_xml = root.get("Folio") or root.get("folio")
                
                if folio_xml:
                    folio_completo = f"COM-{folio_xml}"
                    
                    # Si el folio en BD está vacío o es diferente, lo reescribimos
                    if pago.folio_complemento != folio_completo:
                        pago.folio_complemento = folio_completo
                        actualizados += 1
                        print(f" ✅ [CORREGIDO] Pago ID {pago.id}: Folio asignado -> {folio_completo}")
                    else:
                        ya_estaban_bien += 1
                else:
                    print(f" ⚠️ El XML del UUID {uuid_pago} no tiene folio interno asignado.")
                    errores += 1
                    
            except Exception as e:
                print(f" ❌ Error leyendo el contenido del XML {uuid_pago}: {e}")
                errores += 1
        else:
            print(f" ❌ XML FÍSICO NO ENCONTRADO EN NINGUNA CARPETA para UUID: {uuid_pago}")
            errores += 1

    # 4. Guardar los cambios exactos en la Base de Datos
    db.commit()
    db.close()
    
    print("\n" + "=" * 80)
    print("🏁 RESUMEN DEL RESCATE EXACTO:")
    print(f"   - Folios leídos del XML y guardados: {actualizados}")
    print(f"   - Folios que ya estaban perfectos: {ya_estaban_bien}")
    print(f"   - Errores / XMLs perdidos: {errores}")
    print("=" * 80)

if __name__ == "__main__":
    rescatar_folios_inteligente()