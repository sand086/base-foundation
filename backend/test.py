import pandas as pd
from datetime import datetime

print("Iniciando análisis y generación de Excel con pestañas...")

try:
    # 1. Leer los archivos
    df_excel = pd.read_excel(
        "Reporte_SAT_3T.xlsx", sheet_name="Conciliacion_solicitada_SF_SAT"
    )
    df_db = pd.read_csv("data-1786571040919.csv")
except Exception as e:
    print(f"Error al leer los archivos: {e}")
    exit()

# 2. Normalizar UUIDs para el cruce
df_excel["UUID_NORM"] = df_excel["UUID_NORM"].astype(str).str.strip().str.upper()
df_db["uuid"] = df_db["uuid"].astype(str).str.strip().str.upper()

# Eliminar duplicados para un cruce limpio
df_excel_clean = df_excel.drop_duplicates(subset="UUID_NORM")
df_db_clean = df_db.drop_duplicates(subset="uuid")

# 3. Cruce general (incluyendo los que faltan usando left join)
df_merge = pd.merge(
    df_excel_clean,
    df_db_clean,
    left_on="UUID_NORM",
    right_on="uuid",
    how="left",
    indicator=True,
)

# 4. Normalizar campos para comparación
df_merge["sat_excel"] = df_merge["SAT_ESTATUS"].astype(str).str.strip().str.upper()
df_merge["sat_db"] = df_merge["estatus_sat"].astype(str).str.strip().str.upper()
df_merge["imp_excel"] = (
    pd.to_numeric(df_merge["IMPORTE TOTAL"], errors="coerce").fillna(0.0).round(2)
)
df_merge["imp_db"] = (
    pd.to_numeric(df_merge["total"], errors="coerce").fillna(0.0).round(2)
)

# ==========================================
# 5. FILTRAR CADA CASO EN PESTAÑAS SEPARADAS
# ==========================================
# A. Falsos Vigentes (137 casos)
df_falso_vigente = df_merge[
    (df_merge["sat_excel"] == "CANCELADO") & (df_merge["sat_db"] == "TIMBRADA")
]

# B. Atorados en Proceso (110 casos)
df_atorados = df_merge[
    (df_merge["sat_excel"] == "CANCELADO")
    & (df_merge["sat_db"].isin(["PROCESO_CANCELACION", "PENDIENTE_CANCELAR_SAT"]))
]

# C. Falsos Errores (4 casos)
df_falso_error = df_merge[
    (df_merge["sat_excel"] == "CANCELADO") & (df_merge["sat_db"] == "ERROR_CANCELACION")
]

# D. Errores Reales (6 casos)
df_error_real = df_merge[
    (df_merge["sat_excel"] == "VIGENTE") & (df_merge["sat_db"] == "ERROR_CANCELACION")
]

# E. Discrepancias de Importe (81 casos)
df_importe = df_merge[
    (abs(df_merge["imp_excel"] - df_merge["imp_db"]) > 0.05)
    & (df_merge["_merge"] == "both")
]

# F. Faltantes en Base de Datos (82 casos)
df_faltantes = df_merge[df_merge["_merge"] == "left_only"]

# ==========================================
# 6. EXPORTACIÓN A EXCEL
# ==========================================
# Definir qué columnas mostrar para mayor claridad (CORREGIDO: Usando 'FOLIO' en lugar de 'FOLIO_x')
cols = [
    "UUID_NORM",
    "FOLIO",
    "folio_interno",
    "RFC CLIENTE",
    "imp_excel",
    "imp_db",
    "sat_excel",
    "sat_db",
]
cols_rename = {
    "UUID_NORM": "UUID",
    "FOLIO": "FOLIO_EXCEL",
    "folio_interno": "FOLIO_BD",
    "RFC CLIENTE": "RFC_RECEPTOR",
    "imp_excel": "IMPORTE_EXCEL",
    "imp_db": "IMPORTE_BD",
    "sat_excel": "ESTATUS_SAT",
    "sat_db": "ESTATUS_BD",
}

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
nombre_excel = f"Reporte_Desfases_CFDI_{timestamp}.xlsx"

# Generar el Excel multipestaña
with pd.ExcelWriter(nombre_excel, engine="openpyxl") as writer:
    if not df_falso_vigente.empty:
        df_falso_vigente[cols].rename(columns=cols_rename).to_excel(
            writer, sheet_name="Falsos Vigentes", index=False
        )
    if not df_atorados.empty:
        df_atorados[cols].rename(columns=cols_rename).to_excel(
            writer, sheet_name="Atorados Proceso", index=False
        )
    if not df_falso_error.empty:
        df_falso_error[cols].rename(columns=cols_rename).to_excel(
            writer, sheet_name="Falsos Errores", index=False
        )
    if not df_error_real.empty:
        df_error_real[cols].rename(columns=cols_rename).to_excel(
            writer, sheet_name="Errores Reales", index=False
        )
    if not df_importe.empty:
        df_importe[cols].rename(columns=cols_rename).to_excel(
            writer, sheet_name="Desfase Importes", index=False
        )
    if not df_faltantes.empty:
        # Para los faltantes (CORREGIDO: Usando 'FOLIO' en lugar de 'FOLIO_x')
        cols_faltantes = [
            "UUID_NORM",
            "FOLIO",
            "RFC CLIENTE",
            "IMPORTE TOTAL",
            "SAT_ESTATUS",
        ]
        df_faltantes[cols_faltantes].rename(
            columns={"UUID_NORM": "UUID", "FOLIO": "FOLIO_EXCEL"}
        ).to_excel(writer, sheet_name="Faltantes BD", index=False)

    # En caso de que todo estuviera perfecto (para evitar el error "At least one sheet must be visible")
    if all(
        [
            df_falso_vigente.empty,
            df_atorados.empty,
            df_falso_error.empty,
            df_error_real.empty,
            df_importe.empty,
            df_faltantes.empty,
        ]
    ):
        pd.DataFrame({"Mensaje": ["No se encontraron desfases"]}).to_excel(
            writer, sheet_name="Sin Desfases", index=False
        )

print(f"¡Archivo generado exitosamente en: {nombre_excel}!")
