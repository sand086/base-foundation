import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno para heredar los módulos del proyecto
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db


def encontrar_y_regenerar_nativo():
    db = next(get_db())
    uuid_target = "4F18F5B4-62C6-4D89-9065-74F9AA22ACBF"

    print("\n" + "=" * 80)
    print("🔍 BUSCANDO REGISTRO (IGNORANDO MAYÚSCULAS/MINÚSCULAS EN POSTGRES)")
    print("=" * 80)

    # 1. Buscamos todas las tablas que tengan una columna llamada 'uuid'
    query_tablas = text("""
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'uuid' AND table_schema = 'public'
    """)
    tablas = db.execute(query_tablas).fetchall()
    tabla_real, id_real = None, None

    for t in tablas:
        t_name = t[0]
        try:
            # Usamos LOWER() en ambos lados para romper la sensibilidad de Postgres
            query_search = text(
                f"SELECT id FROM {t_name} WHERE LOWER(uuid) = LOWER(:uuid)"
            )
            res = db.execute(query_search, {"uuid": uuid_target}).fetchone()
            if res:
                id_real = res[0]
                tabla_real = t_name
                print(
                    f"🎯 ¡Encontrado! Vive en la tabla: '{t_name}' | ID interno: {id_real}"
                )
                break
        except:
            continue

    if not id_real:
        print("❌ No se encontró el UUID en ninguna tabla del sistema usando LOWER().")
        db.close()
        return

    print("-" * 80)
    print("⏳ Disparando el motor original de tu sistema para reconstruir el PDF...")

    # 2. Intentamos regenerar usando el flujo nativo de tu API
    pdf_reconstruido = False

    try:
        from app.integrations.sat.api_billing import reconstruir_pdf_factura

        print("🚀 Intentando vía api_billing.reconstruir_pdf_factura()...")
        reconstruir_pdf_factura(invoice_id=id_real, db=db)
        print(
            "✅ ¡Éxito Nativo! El sistema procesó la plantilla original correctamente."
        )
        pdf_reconstruido = True
    except Exception as e:
        print(f"⚠️ El primer motor falló o no aplica a esta tabla: {e}")

    # 3. Intento alternativo usando tu BillingService en caso de que falle el primero
    if not pdf_reconstruido:
        try:
            from app.integrations.sat.billing_service import BillingService

            print(
                "🚀 Intentando vía alternativa billing_service.regenerar_pdf_factura()..."
            )
            try:
                service = BillingService(db)
            except:
                service = BillingService()

            service.regenerar_pdf_factura(id_real)
            print("✅ ¡Éxito Nativo! Reconstruido a través de BillingService.")
            pdf_reconstruido = True
        except Exception as e2:
            print(f"❌ El segundo motor también falló: {e2}")

    db.close()
    print("=" * 80 + "\n")


if __name__ == "__main__":
    encontrar_y_regenerar_nativo()
