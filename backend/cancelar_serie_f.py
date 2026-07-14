import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db


def arreglar_series_vacias():
    db = next(get_db())

    print("\n" + "=" * 80)
    print("🚀 CORRIGIENDO EL CAMPO 'SERIE' EN LA BASE DE DATOS")
    print("=" * 80)

    try:
        # Inyectamos 'CP' para la 17388 y 'F' para la 9762 directamente en la columna serie
        query = text("""
            UPDATE receivable_invoices SET serie = 'CP' WHERE folio_interno = '17388';
            UPDATE receivable_invoices SET serie = 'F' WHERE folio_interno = '9762';
        """)

        result = db.execute(query)
        db.commit()

        print("✅ ¡Éxito! Se asignó la serie 'CP' al folio 17388.")
        print("✅ ¡Éxito! Se asignó la serie 'F' al folio 9762.")
        print("\n💾 BD Sincronizada: El sistema ya sabe qué letras imprimir.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error crítico: {e}")
    finally:
        db.close()
        print("\n" + "=" * 80)
        print("✨ PROCESO TERMINADO. ✨")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    arreglar_series_vacias()
