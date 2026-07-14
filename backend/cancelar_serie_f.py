import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db


def arreglar_folios_con_serie():
    db = next(get_db())

    print("\n" + "=" * 80)
    print("🚀 CORRIGIENDO EL FORMATO DEL FOLIO INTERNO")
    print("=" * 80)

    try:
        # Le regresamos el prefijo CP- y F- a la columna folio_interno
        query = text("""
            UPDATE receivable_invoices 
            SET folio_interno = 'CP-17388' 
            WHERE uuid = '58D2B363-1721-4E5E-8105-B42D56BD5EAA';
            
            UPDATE receivable_invoices 
            SET folio_interno = 'F-9762' 
            WHERE uuid = '78ADE59D-48FF-40A2-84AF-81768B96F1DD';
        """)

        db.execute(query)
        db.commit()

        print("✅ ¡Éxito! El folio 17388 ahora es 'CP-17388'.")
        print("✅ ¡Éxito! El folio 9762 ahora es 'F-9762'.")
        print("\n💾 BD Sincronizada: El sistema ya podrá separar la serie para el PDF.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error crítico: {e}")
    finally:
        db.close()
        print("\n" + "=" * 80)
        print("✨ PROCESO TERMINADO. ✨")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    arreglar_folios_con_serie()
