import sys
from pathlib import Path
from sqlalchemy.orm import make_transient

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice


def cirugia_clonacion_uuids():
    db = next(get_db())

    # 👇 REEMPLAZA AQUÍ CON LOS UUIDs REALES 👇
    uuid_96 = "INSERTA-AQUI-EL-UUID-TERMINACION-96"
    uuid_88 = "INSERTA-AQUI-EL-UUID-TERMINACION-88"

    print("\n" + "=" * 80)
    print("🚀 INICIANDO CIRUGÍA DE DATOS Y CLONACIÓN POR AUDITORÍA")
    print("=" * 80)

    try:
        # 1. Traer los registros
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

        if not factura_96:
            print(
                f"❌ ERROR CRÍTICO: No se encontró la factura base interna en la BD (UUID: {uuid_96})."
            )
            return

        print(f"✅ Registro base interno (96) encontrado: ID {factura_96.id}")

        if factura_88:
            print(f"✅ Registro SAT (88) encontrado: ID {factura_88.id}")
        else:
            print(f"⚠️ Registro SAT (88) NO encontrado en BD (Solo existe en el SAT).")
            print(
                f"   => No hay problema, forzaremos la creación del clon con este UUID."
            )

        # Guardamos las URLs del PDF/XML si es que existen en la 88, si no, lo dejamos null (o hereda las de 96)
        nuevo_xml = factura_88.xml_url if factura_88 else None
        nuevo_pdf = factura_88.pdf_url if factura_88 else None

        # 2. Desvincular el objeto 96 de la sesión para poder clonarlo
        db.expunge(factura_96)
        make_transient(factura_96)

        # 3. Inyectarle los datos correctos al Clon (UUID 88)
        factura_96.id = None  # Para que PostgreSQL le asigne un nuevo ID serial
        factura_96.uuid = uuid_88

        if nuevo_xml:
            factura_96.xml_url = nuevo_xml
        if nuevo_pdf:
            factura_96.pdf_url = nuevo_pdf

        # Asegurarnos de que el nuevo registro esté activo y timbrado
        factura_96.record_status = "ACTIVE"
        factura_96.estatus = "timbrado"
        factura_96.status_sat = "VIGENTE"

        clon_nuevo = factura_96

        # 4. Volver a consultar los originales para ocultarlos (soft-delete)
        original_96 = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == uuid_96)
            .first()
        )

        print("🙈 Ocultando registro original 96 por auditoría...")
        original_96.uuid = f"{uuid_96}_AUDIT"
        original_96.record_status = "DELETED"
        original_96.estatus = "cancelado"

        # Si por algún milagro la 88 sí estaba, también la ocultamos
        if factura_88:
            print("🙈 Ocultando registro original 88 por auditoría...")
            original_88 = (
                db.query(ReceivableInvoice)
                .filter(ReceivableInvoice.uuid == uuid_88)
                .first()
            )
            original_88.uuid = f"{uuid_88}_AUDIT"
            original_88.record_status = "DELETED"
            original_88.estatus = "cancelado"

        # 5. Insertar el clon en la base de datos
        print("🧬 Inyectando el nuevo CLON en la base de datos...")
        db.add(clon_nuevo)

        # 6. Guardar cambios
        db.commit()
        print(
            f"✅ ¡ÉXITO! Clon creado exitosamente. El sistema ahora operará con el UUID {uuid_88}."
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
