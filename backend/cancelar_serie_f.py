import sys
from pathlib import Path
from sqlalchemy.orm import make_transient

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice


def cirugia_clonacion_uuids():
    db = next(get_db())

    # Reemplaza aquí con los UUIDs completos
    uuid_96 = "UUID-COMPLETO-QUE-TERMINA-EN-96"
    uuid_88 = "UUID-COMPLETO-QUE-TERMINA-EN-88"

    print("\n" + "=" * 80)
    print("🚀 INICIANDO CIRUGÍA DE DATOS Y CLONACIÓN POR AUDITORÍA")
    print("=" * 80)

    try:
        # 1. Traer ambos registros
        factura_96 = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == uuid_96)
            .first()
        )
        factura_88 = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == uuid_88)
            .first()
        )

        if not factura_96 or not factura_88:
            print("❌ ERROR: No se encontraron ambos registros en la BD.")
            return

        print(f"✅ Registros encontrados.")
        print(f"   - Origen Interno (96): ID {factura_96.id}")
        print(f"   - Origen SAT (88): ID {factura_88.id}")

        # 2. Desvincular el objeto 96 de la sesión para poder clonarlo
        db.expunge(factura_96)
        make_transient(factura_96)

        # En este punto, 'factura_96' es un objeto nuevo en memoria, sin ID.
        # Vamos a inyectarle los datos del SAT del 88.
        factura_96.id = None  # Para que la BD le asigne un nuevo ID
        factura_96.uuid = factura_88.uuid
        factura_96.xml_url = factura_88.xml_url
        factura_96.pdf_url = factura_88.pdf_url

        # Asegurarnos de que el nuevo registro esté activo y visible
        factura_96.record_status = (
            "ACTIVE"  # Ajusta según uses is_active=True o record_status
        )

        clon_nuevo = factura_96

        # 3. Volver a consultar los originales para ocultarlos (soft-delete) y cambiarles el UUID para evitar colisión
        original_96 = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == uuid_96)
            .first()
        )
        original_88 = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == uuid_88)
            .first()
        )

        print("🙈 Ocultando registros originales por auditoría...")

        # Ocultar el 96
        original_96.uuid = f"{uuid_96}_AUDIT"
        original_96.record_status = "DELETED"  # O is_active = False
        original_96.estatus = "cancelado"

        # Ocultar el 88
        original_88.uuid = f"{uuid_88}_AUDIT"
        original_88.record_status = "DELETED"  # O is_active = False
        original_88.estatus = "cancelado"

        # 4. Insertar el clon en la base de datos
        print("🧬 Inyectando el nuevo CLON con la fusión de datos...")
        db.add(clon_nuevo)

        # 5. Guardar cambios
        db.commit()
        print(
            f"✅ ¡ÉXITO! Clon creado. El sistema ahora mostrará los datos internos del 96 pero con el UUID y archivos del 88."
        )

    except Exception as e:
        db.rollback()
        print(f"❌ Error durante la cirugía: {e}")
    finally:
        db.close()
        print("\n" + "=" * 80)
        print("✨ PROCESO TERMINADO ✨")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    cirugia_clonacion_uuids()
