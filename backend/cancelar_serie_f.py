import sys
from pathlib import Path
from sqlalchemy import text

# Configurar el path del entorno para heredar tu conexión y modelos
sys.path.append(str(Path(__file__).resolve().parent))
from app.db.database import get_db
from app.integrations.sat.payment_service import PaymentComplementService
from app.models import models


def generar_pago_perfecto():
    db = next(get_db())

    # 1. Unificamos la Serie y el Folio en la columna "folio_interno" que SÍ existe
    facturas_data = [
        {"id": 331, "folio_interno": "CP-17665", "monto": 85120.00},
        {"id": 222, "folio_interno": "CP-17559", "monto": 72800.00},
        {"id": 115, "folio_interno": "F-9762", "monto": 3074.00},
        {"id": 108, "folio_interno": "CP-17444", "monto": 45920.00},
        {"id": 105, "folio_interno": "CP-17441", "monto": 45920.00},
        {"id": 87, "folio_interno": "CP-17424", "monto": 45920.00},
        {"id": 745, "folio_interno": "CP-17388", "monto": 44800.00},
    ]

    print("\n" + "=" * 80)
    print("🚀 GENERANDO NUEVO COMPLEMENTO DE PAGO DESDE CERO (VÍA PAC)")
    print("=" * 80)

    try:
        # 2. Actualizar el folio_interno en la BD para que incluya las series "F" y "CP"
        print("🛠️ Alineando series F y CP en la columna 'folio_interno'...")
        for f in facturas_data:
            db.execute(
                text(
                    "UPDATE receivable_invoices SET folio_interno = :folio WHERE id = :id"
                ),
                {"folio": f["folio_interno"], "id": f["id"]},
            )
        db.commit()
        print("   ✅ Folios internos actualizados correctamente.")

        # 3. Obtener el client_id (Hansa Meyer) desde la primera factura
        factura_ejemplo = (
            db.query(models.ReceivableInvoice)
            .filter(models.ReceivableInvoice.id == 331)
            .first()
        )
        if not factura_ejemplo:
            print("❌ No se encontró la factura base en la BD.")
            return

        client_id = factura_ejemplo.client_id

        # 4. Preparar el payload exacto para tu motor de pagos (Mismos montos del XML original)
        pagos_payload = [
            {"invoice_id": f["id"], "monto_pagado": f["monto"]} for f in facturas_data
        ]

        # 5. Instanciar el servicio nativo de tu sistema y timbrar
        print(
            "⏳ Conectando con el PAC para timbrar el nuevo Complemento de Pago (Parcialidad 1)..."
        )
        service = PaymentComplementService(db)

        resultado = service.registrar_pago_y_timbrar_complemento(
            client_id=client_id,
            pagos_data=pagos_payload,
            forma_pago="03",  # Transferencia electrónica de fondos
            fecha_pago="2026-06-30T12:00:00",
            referencia="Pago Liberado Hansa Meyer",
            cuenta_deposito="072905010014973631",  # Tu cuenta (Banorte)
            user_id=1,  # Usuario admin por defecto
        )

        print("\n🎉 ¡TIMBRADO EXITOSO!")
        nuevo_uuid = resultado.get("data", {}).get("uuid", "N/A")
        print(f"👉 Nuevo UUID Oficial: {nuevo_uuid}")
        print("👉 ¡El SAT lo registró con Parcialidad 1 y las series correctas!")

    except Exception as e:
        db.rollback()
        import traceback

        print(f"\n❌ Error al timbrar el pago vía PAC: {e}")
        traceback.print_exc()

    finally:
        db.close()

    print("=" * 80 + "\n")


if __name__ == "__main__":
    generar_pago_perfecto()
