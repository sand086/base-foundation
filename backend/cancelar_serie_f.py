import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db


def revertir_restauracion_masiva():
    db = next(get_db())

    # La misma lista de las facturas que afectamos
    facturas_a_revertir = [
        {"folio": "17388", "uuid": "58D2B363-1721-4E5E-8105-B42D56BD5EAA"},
        {"folio": "17424", "uuid": "78AAB569-26A0-4E1F-BE5E-D0071621DC78"},
        {"folio": "17441", "uuid": "88ABFFF2-6CAB-4366-B352-055AE3272E37"},
        {"folio": "17444", "uuid": "BE87BD06-6B0F-4AF3-B2FB-DBB22D530907"},
        {"folio": "9762", "uuid": "78ADE59D-48FF-40A2-84AF-81768B96F1DD"},
        {"folio": "17559", "uuid": "539129E8-5627-4E1B-B0FC-B34C185CDABF"},
        {"folio": "17665", "uuid": "A7CD5A1D-8094-4A8E-88DC-741581917104"},
    ]

    print("\n" + "=" * 80)
    print("⏪ REVIRTIENDO: MARCANDO FACTURAS COMO PAGADAS NUEVAMENTE")
    print("=" * 80)

    try:
        for fac in facturas_a_revertir:
            # Consulta SQL pura para dejarlas en 0 y pagadas
            query = text("""
                UPDATE receivable_invoices 
                SET 
                    saldo_pendiente = 0,
                    estatus = 'pagado'
                WHERE uuid = :uuid
            """)

            db.execute(query, {"uuid": fac["uuid"]})
            print(
                f"✅ Factura {fac['folio']} revertida | Saldo: $0.00 | Estatus: 'pagado'"
            )

        db.commit()
        print(
            "\n💾 BD Sincronizada: Las facturas han vuelto a su estado original de PAGADAS."
        )

    except Exception as e:
        db.rollback()
        print(f"❌ Error crítico: {e}")
    finally:
        db.close()
        print("\n" + "=" * 80)
        print("✨ PROCESO TERMINADO. ✨")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    revertir_restauracion_masiva()
