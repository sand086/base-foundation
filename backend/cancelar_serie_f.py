import os
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

# Configurar rutas del proyecto
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
print("🛠️ REPARANDO CAMPOS EN EL ARCHIVO XML LOCAL Y LIMPIANDO CACHÉ")
print("=" * 80)

if not xml_path.exists():
    print(f"❌ Error: No se encontró el archivo XML en la ruta: {xml_path}")
    sys.exit(1)

try:
    # Registrar de forma estricta todos los namespaces para mantener la firma del SAT intacta
    ET.register_namespace("cfdi", "http://www.sat.gob.mx/cfd/4")
    ET.register_namespace("pago20", "http://www.sat.gob.mx/Pagos20")
    ET.register_namespace("xsi", "http://www.w3.org/2001/XMLSchema-instance")
    ET.register_namespace("tfd", "http://www.sat.gob.mx/TimbreFiscalDigital")

    # Cargar y parsear el XML proveído
    tree = ET.parse(xml_path)
    root = tree.getroot()

    modificado = False

    # Iterar sobre los elementos usando el nombre de tag correcto del SAT (DoctoRelacionado)
    for elemento in root.iter():
        if elemento.tag.endswith("DoctoRelacionado"):
            folio = elemento.get("Folio")
            if folio == "17388":
                elemento.set("Serie", "CP")
                print("✅ Serie 'CP' asignada exitosamente al Folio 17388.")
                modificado = True

    if modificado:
        # Sobrescribir el XML con los cambios aplicados
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)
        print(
            "💾 Archivo XML actualizado correctamente en el almacenamiento del servidor."
        )

        # Eliminar el archivo PDF viejo para obligar al backend a leer la nueva estructura
        if pdf_path.exists():
            os.remove(pdf_path)
            print("🗑️ PDF anterior removido con éxito para limpiar la caché.")

        print("\n🚀 ¡PROCESO COMPLETADO! El origen de datos quedó reparado.")
    else:
        print("⚠️ No se encontró la factura con el Folio '17388' dentro del XML.")

except Exception as e:
    print(f"❌ Error crítico al manipular el archivo XML: {e}")
finally:
    print("=" * 80 + "\n")
