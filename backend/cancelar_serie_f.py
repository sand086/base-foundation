import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path para heredar los módulos de la aplicación
sys.path.append(str(Path(__file__).resolve().parent))

from app.db.database import get_db


def forzar_restauracion_masiva():
    db = next(get_db())

    # Lista exacta extraída del XML del SAT con el monto que se pagó de cada una
    facturas_a_liberar = [
        {
            "folio": "17388",
            "uuid": "58D2B363-1721-4E5E-8105-B42D56BD5EAA",
            "monto": 44800.00,
        },
        {
            "folio": "17424",
            "uuid": "78AAB569-26A0-4E1F-BE5E-D0071621DC78",
            "monto": 45920.00,
        },
        {
            "folio": "17441",
            "uuid": "88ABFFF2-6CAB-4366-B352-055AE3272E37",
            "monto": 45920.00,
        },
        {
            "folio": "17444",
            "uuid": "BE87BD06-6B0F-4AF3-B2FB-DBB22D530907",
            "monto": 45920.00,
        },
        {
            "folio": "9762",
            "uuid": "78ADE59D-48FF-40A2-84AF-81768B96F1DD",
            "monto": 3074.00,
        },
        {
            "folio": "17559",
            "uuid": "539129E8-5627-4E1B-B0FC-B34C185CDABF",
            "monto": 72800.00,
        },
        {
            "folio": "17665",
            "uuid": "A7CD5A1D-8094-4A8E-88DC-741581917104",
            "monto": 85120.00,
        },
    ]

    print("\n" + "=" * 80)
    print("🚀 FORZANDO RESTAURACIÓN DE LAS 7 FACTURAS DEL PAGO")
    print("=" * 80)

    try:
        for fac in facturas_a_liberar:
            # Consulta SQL pura, sin usar el ORM para evitar fallas
            query = text("""
                UPDATE receivable_invoices 
                SET 
                    saldo_pendiente = :monto,
                    estatus = 'pendiente'
                WHERE uuid = :uuid
            """)

            db.execute(query, {"monto": fac["monto"], "uuid": fac["uuid"]})
            print(
                f"✅ Factura {fac['folio']} liberada | Saldo devuelto: ${fac['monto']} | Estatus: 'pendiente'"
            )

        # Arreglamos también las URLs de descarga de la 17388 por si seguían apuntando al UUID viejo
        uuid_17388_bueno = "58D2B363-1721-4E5E-8105-B42D56BD5EAA"
        uuid_17388_malo = "A3731D16-EB53-484F-9F87-346EC6DEDB7B"

        query_urls = text("""
            UPDATE receivable_invoices 
            SET 
                pdf_url = REPLACE(pdf_url, :malo, :bueno),
                xml_url = REPLACE(xml_url, :malo, :bueno)
            WHERE uuid = :bueno
        """)
        db.execute(query_urls, {"malo": uuid_17388_malo, "bueno": uuid_17388_bueno})
        print(
            "\n🔗 URLs de descarga PDF/XML de la factura 17388 apuntadas al UUID nuevo."
        )

        db.commit()
        print(
            "\n💾 BD Sincronizada: TODAS las facturas están listas para cobrarse en tu sistema."
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
    forzar_restauracion_masiva()
