import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db


def analizar_y_localizar():
    db = next(get_db())
    uuid_target = "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF"

    print("\n" + "=" * 80)
    print("🔍 LOCALIZANDO REGISTRO REAL Y EXAMINANDO MOTOR NATIVO")
    print("=" * 80)

    # 1. Escaneo universal para encontrar el ID del COM de pago
    query_tablas = text("""
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'uuid' AND table_schema = 'public'
    """)
    tablas = db.execute(query_tablas).fetchall()
    tabla_real, id_real = None, None

    for t in tablas:
        t_name = t[0]
        try:
            res = db.execute(
                text(f"SELECT id FROM {t_name} WHERE uuid = :uuid"),
                {"uuid": uuid_target},
            ).fetchone()
            if res:
                tabla_real, id_real = t_name, res[0]
                print(f"🎯 ¡Localizado! Tabla: '{t_name}' | ID del Registro: {id_real}")
                break
        except:
            continue

    if not tabla_real:
        print("❌ No se encontró el UUID del pago en ninguna tabla.")
        db.close()
        return

    # 2. Leer la función de reconstrucción del sistema para clonar su llamada exacta
    api_path = Path("app/integrations/sat/api_billing.py")
    if api_path.exists():
        contenido = api_path.read_text().splitlines()
        print("\n📦 REVISANDO TU MÉTODO NATIVO DE GENERACIÓN:")
        for idx, line in enumerate(contenido):
            if "def reconstruir_pdf_factura" in line:
                print(
                    f"\n--- Código de reconstruir_pdf_factura (Línea {idx+1} en adelante) ---"
                )
                for k in range(idx, min(idx + 25, len(contenido))):
                    print(contenido[k])
                break

    db.close()
    print("=" * 80 + "\n")


if __name__ == "__main__":
    analizar_y_localizar()
