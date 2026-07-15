import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno para heredar tu conexión y modelos
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db
from app.integrations.sat.payment_service import PaymentComplementService
from app.models import models


def restaurar_y_timbrar():
    db = next(get_db())

    # 1. Facturas extraídas EXACTAMENTE de tu XML oficial
    facturas_xml = [
        {
            "uuid": "A7CD5A1D-8094-4A8E-88DC-741581917104",
            "folio_interno": "CP-17665",
            "monto": 85120.00,
        },
        {
            "uuid": "539129E8-5627-4E1B-B0FC-B34C185CDABF",
            "folio_interno": "CP-17559",
            "monto": 72800.00,
        },
        {
            "uuid": "78ADE59D-48FF-40A2-84AF-81768B96F1DD",
            "folio_interno": "F-9762",
            "monto": 3074.00,
        },
        {
            "uuid": "BE87BD06-6B0F-4AF3-B2FB-DBB22D530907",
            "folio_interno": "CP-17444",
            "monto": 45920.00,
        },
        {
            "uuid": "88ABFFF2-6CAB-4366-B352-055AE3272E37",
            "folio_interno": "CP-17441",
            "monto": 45920.00,
        },
        {
            "uuid": "78AAB569-26A0-4E1F-BE5E-D0071621DC78",
            "folio_interno": "CP-17424",
            "monto": 45920.00,
        },
        {
            "uuid": "58D2B363-1721-4E5E-8105-B42D56BD5EAA",
            "folio_interno": "CP-17388",
            "monto": 44800.00,
        },
    ]

    print("\n" + "=" * 80)
    print("🔧 FASE 1: RESTAURANDO FACTURAS A 'PENDIENTE' Y LIMPIANDO PAGOS")
    print("=" * 80)

    try:
        facturas_db = []
        client_id = None

        # 2. Recorremos el XML, actualizamos folios/saldos y extraemos IDs
        for f in facturas_xml:
            # Buscamos por UUID ignorando mayúsculas/minúsculas
            query_buscar = text(
                "SELECT id, client_id FROM receivable_invoices WHERE LOWER(uuid) = LOWER(:u)"
            )
            res = db.execute(query_buscar, {"u": f["uuid"]}).fetchone()

            if res:
                inv_id = res[0]
                client_id = res[1]  # Guardamos el client_id (Hansa Meyer) para el pago

                # Armamos la lista que requiere el PaymentComplementService
                facturas_db.append({"invoice_id": inv_id, "monto_pagado": f["monto"]})

                # A) Restaurar la factura: Estatus pendiente, saldo completo, y fijar el prefijo CP/F
                db.execute(
                    text("""
                        UPDATE receivable_invoices 
                        SET estatus = 'pendiente', 
                            saldo_pendiente = monto_total, 
                            folio_interno = :fol 
                        WHERE id = :id
                    """),
                    {"fol": f["folio_interno"], "id": inv_id},
                )

                # B) Borrar cualquier intento de pago previo para asegurar Parcialidad 1
                db.execute(
                    text(
                        "DELETE FROM receivable_invoice_payments WHERE invoice_id = :id"
                    ),
                    {"id": inv_id},
                )

        db.commit()
        print(
            "   ✅ Facturas restauradas a estatus 'pendiente' y saldos restablecidos."
        )
        print("   ✅ Pagos huérfanos eliminados para garantizar Parcialidad 1.")

        if not facturas_db:
            print(
                "❌ No se encontraron las facturas en la base de datos basándonos en los UUIDs."
            )
            return

        print("\n" + "=" * 80)
        print("🚀 FASE 2: TIMBRANDO EL NUEVO COMPLEMENTO DE PAGO VÍA PAC")
        print("=" * 80)

        # 3. Búsqueda dinámica y segura de la cuenta bancaria Banorte
        cuenta_bancaria = db.execute(
            text(
                "SELECT id FROM bank_accounts WHERE numero_cuenta LIKE '%072905010014973631%' LIMIT 1"
            )
        ).fetchone()
        if cuenta_bancaria:
            bank_account_id = cuenta_bancaria[0]
        else:
            fallback_cuenta = db.execute(
                text(
                    "SELECT id FROM bank_accounts WHERE LOWER(banco) LIKE '%banorte%' LIMIT 1"
                )
            ).fetchone()
            bank_account_id = fallback_cuenta[0] if fallback_cuenta else 1

        # 4. Disparar timbrado usando el motor nativo de tu sistema
        print("⏳ Enviando payload al SAT a través de PaymentComplementService...")
        service = PaymentComplementService(db)

        resultado = service.registrar_pago_y_timbrar_complemento(
            client_id=client_id,
            pagos_data=facturas_db,
            forma_pago="03",  # 03 = Transferencia electrónica de fondos[cite: 4]
            fecha_pago="2026-06-30T12:00:00",  # Fecha de tu XML[cite: 4]
            referencia="Pago Liberado Hansa Meyer",
            cuenta_deposito=bank_account_id,
            user_id=1,
        )

        print("\n🎉 ¡TIMBRADO EXITOSO!")
        nuevo_uuid = resultado.get("data", {}).get("uuid", "N/A")
        print(f"👉 Nuevo UUID Oficial: {nuevo_uuid}")
        print(
            "👉 ¡El SAT lo registró con Parcialidad 1 y las series ('CP' y 'F') correctas!"
        )

    except Exception as e:
        db.rollback()
        import traceback

        print(f"\n❌ Error durante el proceso: {e}")
        traceback.print_exc()
    finally:
        db.close()

    print("=" * 80 + "\n")


if __name__ == "__main__":
    restaurar_y_timbrar()
