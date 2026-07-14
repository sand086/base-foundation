import sys
from pathlib import Path
from sqlalchemy.orm import make_transient

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db
from app.models.models import ReceivableInvoice


def cirugia_clonacion_folios():
    db = next(get_db())

    # Datos exactos extraídos de tu reporte del SAT
    folio_96 = "17396"
    uuid_96 = "A3731D16-EB53-484F-9F87-346EC6DEDB7B"

    folio_88 = "17388"
    uuid_88 = "58D2B363-1721-4E5E-8105-B42D56BD5EAA"

    print("\n" + "=" * 80)
    print(f"🚀 INICIANDO CIRUGÍA: CLONANDO FOLIO {folio_96} -> {folio_88}")
    print("=" * 80)

    try:
        # 1. Buscar los registros originales en la BD
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
                f"❌ ERROR CRÍTICO: No se encontró la factura base en la BD (Folio {folio_96} | UUID {uuid_96})."
            )
            return

        print(f"✅ Registro base interno ({folio_96}) encontrado: ID {factura_96.id}")

        if factura_88:
            print(f"✅ Registro SAT ({folio_88}) encontrado: ID {factura_88.id}")
            nuevo_xml = factura_88.xml_url
            nuevo_pdf = factura_88.pdf_url
        else:
            print(
                f"⚠️ Registro SAT ({folio_88}) NO encontrado en BD (Solo existe en el SAT)."
            )
            print(f"   => Crearemos el clon forzando el UUID {uuid_88}.")
            nuevo_xml = None
            nuevo_pdf = None

        # 2. Desvincular el objeto 96 de la sesión para clonarlo
        db.expunge(factura_96)
        make_transient(factura_96)

        # 3. Preparar el CLON inyectando los datos de la factura 88
        factura_96.id = (
            None  # Al dejarlo en None, la BD le asignará el siguiente ID disponible
        )
        factura_96.uuid = uuid_88
        factura_96.folio_interno = folio_88  # Sincronizamos el folio interno

        if nuevo_xml:
            factura_96.xml_url = nuevo_xml
        if nuevo_pdf:
            factura_96.pdf_url = nuevo_pdf

        # Forzar que el nuevo clon nazca sano, activo y timbrado
        factura_96.record_status = "ACTIVE"
        factura_96.estatus = "timbrado"
        factura_96.status_sat = "VIGENTE"

        clon_nuevo = factura_96

        # 4. Ocultar los originales (Soft Delete con INACTIVE + sufijo _AUDIT en el UUID)
        original_96 = (
            db.query(ReceivableInvoice)
            .filter(ReceivableInvoice.uuid == uuid_96)
            .first()
        )
        print(f"🙈 Ocultando registro original {folio_96} por auditoría...")
        original_96.uuid = f"{uuid_96}_AUDIT"
        # CORRECCIÓN: Usamos INACTIVE que es el estándar de SQL para Enums de estado
        original_96.record_status = "INACTIVE"
        original_96.estatus = "cancelado"

        # Si la factura 88 existía localmente, la ocultamos también
        if factura_88:
            print(f"🙈 Ocultando registro original {folio_88} por auditoría...")
            original_88 = (
                db.query(ReceivableInvoice)
                .filter(ReceivableInvoice.uuid == uuid_88)
                .first()
            )
            original_88.uuid = f"{uuid_88}_AUDIT"
            # CORRECCIÓN: Usamos INACTIVE
            original_88.record_status = "INACTIVE"
            original_88.estatus = "cancelado"

        # 5. Insertar el nuevo clon en la base de datos
        print("🧬 Inyectando el nuevo CLON en la base de datos...")
        db.add(clon_nuevo)

        # 6. Ejecutar los cambios
        db.commit()
        print(
            f"✅ ¡ÉXITO! Clon creado. Tu sistema ahora usará el folio {folio_88} ({uuid_88}) manteniendo el rastro histórico intacto."
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
    cirugia_clonacion_folios()
