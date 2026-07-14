import os
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

# Configurar la ruta base
backend_dir = Path(__file__).resolve().parent
xml_path = (
    backend_dir
    / "app"
    / "storage"
    / "xml_timbrados"
    / "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF.xml"
)
pdf_path = (
    backend_dir
    / "app"
    / "storage"
    / "xml_timbrados"
    / "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF.pdf"
)

print("\n" + "=" * 80)
# Tiempos modernos en 2026: Arreglando la data directo en el core del XML
print("🛠️ INYECTANDO SERIES DIRECTAMENTE EN EL ARCHIVO XML LOCAL")
print("=" * 80)

if not xml_path.exists():
    print(f"❌ Error: No se encontró el archivo XML en {xml_path}")
    sys.exit(1)

try:
    # Registrar los namespaces para no romper la estructura del SAT
    ET.register_namespace("cfdi", "http://www.sat.gob.mx/cfd/4")
    ET.register_namespace("pago20", "http://www.sat.gob.mx/Pagos20")
    ET.register_namespace("xsi", "http://www.w3.org/2001/XMLSchema-instance")

    tree = ET.parse(xml_path)
    root = tree.getroot()

    modificado = False
    # Buscar los nodos de los documentos relacionados dentro del XML
    for elemento in root.iter():
        if elemento.tag.endswith("DocRelacionado"):
            folio = elemento.get("Folio")
            if folio == "17388":
                elemento.set("Serie", "CP")
                print("✅ Serie 'CP' inyectada exitosamente al Folio 17388.")
                modificado = True
            elif folio == "9762":
                elemento.set("Serie", "F")
                print("✅ Serie 'F' inyectada exitosamente al Folio 9762.")
                modificado = True

    if modificado:
        # Guardar los cambios en el archivo XML
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)
        print("💾 Archivo XML actualizado en el servidor.")

        # Eliminar el PDF viejo para obligar al sistema a leer el XML corregido
        if pdf_path.exists():
            os.remove(pdf_path)
            print("🗑️ PDF anterior eliminado para limpiar la caché.")

        print("\n🚀 ¡PROCESO EXITOSO! El origen de los datos ya tiene las series.")
    else:
        print("⚠️ No se encontraron los folios 17388 o 9762 dentro del XML.")

except Exception as e:
    print(f"❌ Error crítico al manipular el XML: {e}")
finally:
    print("\n" + "=" * 80 + "\n")
