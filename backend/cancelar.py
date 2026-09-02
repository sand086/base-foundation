import os
import sys
import logging
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

# Importaciones de tu proyecto
from app.db.database import SessionLocal
from app.models.models import SatProduct

# Configuración básica de logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Tamaño de bloque para evitar límites de memoria y de parámetros en PostgreSQL
BATCH_SIZE = 5000


def sincronizar_productos_sat(ruta_excel: str):
    """
    Sincroniza ÚNICAMENTE la tabla SatProduct leyendo la pestaña c_ClaveProdServCP.
    Actualiza la descripción y la bandera 'es_material_peligroso' en lotes.
    """
    logger.info(f"📂 Leyendo catálogo desde: {ruta_excel}")
    hoja_sat = "c_ClaveProdServCP"

    try:
        # Se saltan 4 filas iniciales para leer los encabezados reales (Fila 5 del Excel)
        # dtype=str preserva los ceros a la izquierda
        df = pd.read_excel(ruta_excel, sheet_name=hoja_sat, skiprows=4, dtype=str)
    except Exception as e:
        logger.error(f"❌ Error al abrir la hoja '{hoja_sat}' del Excel: {e}")
        return

    # Limpiar espacios en blanco de los nombres de columnas
    df.columns = df.columns.str.strip()

    col_clave = "c_ClaveProdServ"
    col_desc = "Descripción"
    col_mat = "Material Peligroso"

    # Validar que el Excel tenga las columnas requeridas
    for col in [col_clave, col_desc, col_mat]:
        if col not in df.columns:
            logger.error(
                f"❌ Columna requerida '{col}' no encontrada en la hoja '{hoja_sat}'. "
                f"Columnas detectadas: {list(df.columns)}"
            )
            return

    db: Session = SessionLocal()

    try:
        productos_a_procesar = []

        for index, row in df.iterrows():
            raw_clave = str(row.get(col_clave, "")).strip()

            if not raw_clave or raw_clave.lower() == "nan":
                continue

            # Preservar ceros a la izquierda (ej. "01010101")
            clave = raw_clave.zfill(8) if raw_clave.isdigit() else raw_clave

            # Ignorar registros que no sean claves de 8 dígitos (ej. títulos o textos)
            if len(clave) != 8:
                continue

            descripcion = str(row.get(col_desc, "")).strip()
            if descripcion.lower() == "nan":
                descripcion = ""

            mat_peligroso_raw = str(row.get(col_mat, "")).strip()

            # Respetar valores oficiales del SAT: "0", "1", "0,1"
            if mat_peligroso_raw in ["0,1", "1", "0"]:
                flag_peligroso = mat_peligroso_raw
            else:
                flag_peligroso = "0"

            productos_a_procesar.append(
                {
                    "clave": clave,
                    "descripcion": descripcion,
                    "es_material_peligroso": flag_peligroso,
                    "activo": True,
                }
            )

        total_registros = len(productos_a_procesar)
        logger.info(
            f"📊 Se extrajeron {total_registros} claves válidas. Iniciando sincronización por lotes..."
        )

        if not productos_a_procesar:
            logger.warning("⚠️ No se encontraron productos válidos para procesar.")
            return

        # -------------------------------------------------------------------
        # UPSERT MASIVO POR LOTES (Exclusivo para la tabla SatProduct)
        # -------------------------------------------------------------------
        for i in range(0, total_registros, BATCH_SIZE):
            lote = productos_a_procesar[i : i + BATCH_SIZE]

            stmt = insert(SatProduct).values(lote)
            stmt = stmt.on_conflict_do_update(
                index_elements=["clave"],  # Campo UNIQUE o PK en el modelo
                set_={
                    "es_material_peligroso": stmt.excluded.es_material_peligroso,
                    "descripcion": stmt.excluded.descripcion,
                    "activo": stmt.excluded.activo,
                },
            )
            db.execute(stmt)
            db.commit()
            logger.info(
                f"  └─ Lote {i // BATCH_SIZE + 1}: {len(lote)} registros actualizados/insertados."
            )

        logger.info("✅ Sincronización de productos completada con éxito.")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error durante la inserción en la BD: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    sincronizar_productos_sat("CatalogosCartaPorte31.xls")
