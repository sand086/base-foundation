import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db


def buscar_nuevo_uuid():
    db = next(get_db())

    # Buscamos el último pago timbrado que se acaba de generar
    query = text("""
        SELECT complemento_uuid, folio_complemento, parcialidad 
        FROM receivable_invoice_payments 
        WHERE complemento_uuid IS NOT NULL 
        ORDER BY id DESC LIMIT 1
    """)

    res = db.execute(query).fetchone()

    print("\n" + "=" * 80)
    if res:
        print(f"🎉 ¡AQUÍ ESTÁ TU NUEVO COMPLEMENTO OFICIAL!")
        print(f"👉 UUID del SAT: {res[0]}")
        print(f"📄 Folio Interno: {res[1]}")
        print(f"🔢 Parcialidad Registrada: {res[2]}")
        print("\nPara descargar tu PDF impecable, entra a:")
        print(f"https://3tapp.online/api/sat/invoice/{res[0]}/pdf?limpiar_cache=1")
    else:
        print("❌ No se encontraron complementos timbrados recientemente.")

    print("=" * 80 + "\n")


if __name__ == "__main__":
    buscar_nuevo_uuid()
