import pandas as pd
import logging
import sys
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import (
    insert,
)  # Usamos PostgreSQL para el Upsert masivo

# Ajusta estas importaciones según la estructura real de tu proyecto
from app.db.database import SessionLocal
from app.models.models import SatProduct

# Configuración básica de logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def sincronizar_productos_sat(ruta_excel: str):
    """
    Sincroniza ÚNICAMENTE la tabla SatProduct usando el catálogo oficial.
    Actualiza la descripción y la bandera 'es_material_peligroso'.
    """
    logger.info(f"📂 Leyendo catálogo desde: {ruta_excel}")

    try:
        # El SAT incluye 2 filas de títulos antes de los datos reales, usamos skiprows=2
        # Forzamos dtype=str para que las claves como "01010101" no pierdan el cero inicial
        df = pd.read_excel(
            ruta_excel, sheet_name="c_ClaveProdServCP", skiprows=2, dtype=str
        )
    except Exception as e:
        logger.error(f"❌ Error al leer el archivo Excel: {e}")
        return

    # Limpiar nombres de columnas por si traen espacios ocultos
    df.columns = df.columns.str.strip()

    db: Session = SessionLocal()

    try:
        productos_a_procesar = []

        for index, row in df.iterrows():
            clave = str(row.get("Clave Producto/Servicio", "")).strip()

            # Solo procesamos claves válidas de 8 dígitos
            if not clave or clave == "nan" or len(clave) != 8:
                continue

            descripcion = str(row.get("Descripción", "")).strip()
            mat_peligroso_raw = str(row.get("Material Peligroso", "")).strip()

            # Respetar estrictamente los valores del SAT: "0", "1", o "0,1"
            if mat_peligroso_raw in ["0,1", "1", "0"]:
                flag_peligroso = mat_peligroso_raw
            else:
                flag_peligroso = "0"

            productos_a_procesar.append(
                {
                    "clave": clave,
                    "descripcion": descripcion,
                    "es_material_peligroso": flag_peligroso,
                    "activo": True,  # Mantenemos el campo activo en true
                }
            )

        logger.info(
            f"📊 Se extrajeron {len(productos_a_procesar)} claves. Sincronizando BD..."
        )

        # -------------------------------------------------------------------
        # UPSERT MASIVO (Solo para PostgreSQL)
        # Si la clave ya existe, actualiza los valores. Si no, la inserta.
        # -------------------------------------------------------------------
        stmt = insert(SatProduct).values(productos_a_procesar)

        # Le indicamos a la BD qué hacer si hay un conflicto (si la 'clave' ya existe)
        stmt = stmt.on_conflict_do_update(
            index_elements=[
                "clave"
            ],  # <-- Asume que 'clave' es UNIQUE o Primary Key en tu modelo
            set_={
                "es_material_peligroso": stmt.excluded.es_material_peligroso,
                "descripcion": stmt.excluded.descripcion,
                "activo": stmt.excluded.activo,
            },
        )

        db.execute(stmt)
        db.commit()
        logger.info("✅ Sincronización de productos completada con éxito.")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error durante la inserción en BD: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    # Asegúrate de tener el Excel oficial de Carta Porte 3.1 descargado en esta ruta
    # Descárgalo desde: http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/CatalogosCartaPorte31.xls
    sincronizar_productos_sat("CatalogosCartaPorte31.xls")
